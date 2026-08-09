import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import StarField from '../StarField.vue'

describe('StarField', () => {
  let wrapper

  beforeEach(() => {
    // The render loop is driven by requestAnimationFrame, which would otherwise
    // keep scheduling itself forever across tests (the component never cancels it).
    vi.stubGlobal('requestAnimationFrame', vi.fn())
    // jsdom doesn't implement canvas; stub getContext so mounted() has something to call.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(),
      fillStyle: ''
    })
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders a canvas element', () => {
    wrapper = mount(StarField, {
      props: { isRunning: true, starSpeed: 0.1 },
      attachTo: document.body
    })
    expect(wrapper.find('canvas#canvas').exists()).toBe(true)
  })

  it('tracks the isRunning prop into its internal animation state', async () => {
    wrapper = mount(StarField, {
      props: { isRunning: true, starSpeed: 0.1 },
      attachTo: document.body
    })
    expect(wrapper.vm.isAnimated).toBe(true)

    await wrapper.setProps({ isRunning: false })
    expect(wrapper.vm.isAnimated).toBe(false)
  })

  it('tracks the starSpeed prop into its internal speed state', async () => {
    wrapper = mount(StarField, {
      props: { isRunning: true, starSpeed: 0.1 },
      attachTo: document.body
    })

    await wrapper.setProps({ starSpeed: 0.8 })
    expect(wrapper.vm.starSpeeder).toBe(0.8)
  })
})
