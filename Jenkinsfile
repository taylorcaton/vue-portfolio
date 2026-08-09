// Jenkinsfile — CI/CD pipeline definition for taylorcaton.github.io
//
// This is a Vue 3 + Vite static site. Jenkins builds it and publishes the
// build output to the `gh-pages` branch, which GitHub Pages serves at
// taylorcaton.com. Jenkins runs on a home server ("ernie") and polls the
// `main` branch for changes every ~5 minutes (see PIPELINE.md for why —
// short version: no public webhook is reachable behind this network).
//
// Pipeline flow, in order:
//   1. Install dependencies
//   2. Lint          (fails the build if it fails)
//   3. Unit tests     (fails the build if it fails)
//   4. Build          (Vite production build -> dist/)
//   5. Lighthouse audit of dist/ (recorded for history, never fails the build)
//   6. Deploy dist/ to the gh-pages branch (only runs if steps 1-4 passed)
//
// Everything runs inside one custom Docker image, `lhci-runner:node22-chrome`,
// which bundles Node 22 and Google Chrome. Chrome is only needed for the
// Lighthouse stage, but using a single image for every stage keeps the
// pipeline simple.

pipeline {
  agent {
    docker {
      image 'lhci-runner:node22-chrome'
      // Extra Docker flags Chrome needs to run headless (no visible window)
      // inside a container:
      //   --network lhci_default   Lets this container reach the Lighthouse
      //                             CI server by its container name (`lhci`)
      //                             instead of needing to know its IP.
      //   --cap-add=SYS_ADMIN      Chrome's sandboxing normally relies on
      //                             kernel features Docker restricts by
      //                             default; this grants back what headless
      //                             Chrome needs in order to start.
      //   --shm-size=2g            Chrome uses shared memory (/dev/shm) for
      //                             rendering. Docker's default (64MB) is
      //                             too small and causes random crashes.
      args '--network lhci_default --cap-add=SYS_ADMIN --shm-size=2g'
    }
  }

  options {
    // Automatically kill the build if it's still running after 20 minutes.
    // Normal builds finish in a few minutes; this just stops a hung build
    // (e.g. Chrome failing to exit) from blocking the next one forever.
    timeout(time: 20, unit: 'MINUTES')

    // Keep only the 20 most recent builds' logs and artifacts. Older ones
    // are deleted automatically so the Jenkins server doesn't slowly fill
    // its disk.
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    // Secrets are injected by Jenkins from its credential store (configured
    // in the Jenkins UI, not in this file), so nothing sensitive is checked
    // into the repo.
    LHCI_TOKEN                = credentials('lhci-build-token')          // auth token for the Lighthouse CI server
    LHCI_BASIC_AUTH_PASSWORD  = credentials('lhci-basic-auth-password')  // basic-auth password for that same server

    // Point npm's package cache at a folder inside this build's own
    // workspace, instead of a machine-wide location, so two builds running
    // at the same time can't corrupt each other's cache.
    npm_config_cache          = "${WORKSPACE}/.npm"
  }

  stages {

    // Installs exact dependency versions from package-lock.json. Unlike
    // `npm install`, `npm ci` never modifies the lockfile and fails loudly
    // if package.json and the lockfile disagree — safer for CI than a local
    // install would be.
    stage('Install') {
      steps { sh 'npm ci' }
    }

    // Gate: if this fails, the pipeline stops here and nothing deploys.
    // Only lints src/ (the app's own source code) — build output and config
    // files are excluded via .eslintignore. Unlike the local `npm run lint`
    // script, this does NOT pass --fix: CI should verify the code is
    // already clean, not silently rewrite it.
    stage('Lint') {
      steps {
        sh 'npx eslint src --ext .vue,.js,.jsx,.cjs,.mjs'
      }
    }

    // Gate: like Lint, a failure here stops the pipeline before deploy.
    // --passWithNoTests means an empty test suite doesn't count as a
    // failure (there are currently no unit tests in this repo).
    stage('Unit tests') {
      steps {
        sh 'npx vitest run --passWithNoTests'
      }
    }

    // Runs Vite's production build, producing static HTML/CSS/JS in dist/.
    // This is the exact output that later gets deployed to GitHub Pages.
    stage('Build') {
      steps { sh 'npm run build' }
    }

    // Records Lighthouse scores (performance, accessibility, SEO, etc.) for
    // this build so trends are visible over time on the LHCI server. This
    // stage never fails the pipeline — see the trailing `|| true` here, and
    // the "no assert block" explanation in lighthouserc.cjs.
    stage('Lighthouse') {
      steps {
        sh '''
          # LHCI needs to know which branch it's auditing, for labeling
          # results on the server. Jenkins checks out a detached commit
          # (not an actual branch), so LHCI can't infer this on its own —
          # it's set explicitly here instead.
          export LHCI_BUILD_CONTEXT__CURRENT_BRANCH=main

          # `--yes` skips npx's interactive "ok to install this?" prompt,
          # which would otherwise hang with no terminal to answer it.
          # The LHCI CLI version is pinned to the 0.15.x line so a future
          # major release can't silently change behavior mid-pipeline.
          npx --yes @lhci/cli@0.15.x autorun \
            --upload.basicAuth.username=taylor \
            --upload.basicAuth.password="$LHCI_BASIC_AUTH_PASSWORD" \
          || true
        '''
      }
    }

    // Only reached if Install, Lint, Unit tests, and Build all succeeded.
    // Pushes the contents of dist/ to the gh-pages branch, which is the
    // branch GitHub Pages actually serves — this is the one stage that
    // changes the live site.
    stage('Deploy to gh-pages') {
      steps {
        // sshagent makes the deploy key available to git/ssh for just this
        // block, without ever writing the private key to disk.
        sshagent(credentials: ['github-deploy-key']) {
          sh '''
            mkdir -p ~/.ssh
            # Trust GitHub's host key up front so the push below doesn't
            # hang on an interactive "are you sure you want to continue
            # connecting?" prompt (there's no terminal in CI to answer it).
            ssh-keyscan -t ed25519,rsa github.com >> ~/.ssh/known_hosts 2>/dev/null

            # Git requires a committer name/email to make a commit. These
            # are just labels shown in the gh-pages commit history, not a
            # real account.
            git config --global user.email "jenkins@ernie.local"
            git config --global user.name  "Jenkins (ernie)"

            # gh-pages@5 builds a commit from the dist/ folder and pushes it
            # to the gh-pages branch, replacing its contents wholesale.
            # Version pinned for the same reason as the LHCI CLI above.
            npx --yes gh-pages@5 \
              -d dist \
              -r git@github.com:taylorcaton/taylorcaton.github.io.git \
              -b gh-pages \
              -m "Deploy from Jenkins build ${BUILD_NUMBER}"
          '''
        }
      }
    }
  }

  post {
    // Runs only when every stage above succeeded.
    success {
      cleanWs() // delete the workspace on disk; nothing here needs to persist between builds
      echo "Build ${BUILD_NUMBER} deployed. Lighthouse history: http://ernie.local:9001"
    }
    // Runs when any stage failed. The workspace is deliberately left in
    // place (no cleanWs()) so it can be inspected afterward to debug what
    // went wrong.
    failure {
      echo "Build ${BUILD_NUMBER} failed -- gh-pages unchanged. (Workspace kept for debugging.)"
    }
  }
}
