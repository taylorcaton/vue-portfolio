import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Typewriter from 'typewriter-effect/dist/core'
import Portfolio from '../Portfolio.vue'

vi.mock('typewriter-effect/dist/core', () => {
  const Ctor = vi.fn().mockImplementation(() => {
    const instance = {
      pauseFor: () => instance,
      typeString: () => instance,
      deleteChars: () => instance,
      start: () => instance
    }
    return instance
  })
  return { default: Ctor }
})

describe('Portfolio', () => {
  it('renders the name and role description', () => {
    const wrapper = mount(Portfolio, { props: { isRunning: false } })
    expect(wrapper.text()).toContain('Taylor Caton')
    expect(wrapper.text()).toContain('full-stack developer')
  })

  it('links to the GitHub and LinkedIn profiles', () => {
    const wrapper = mount(Portfolio, { props: { isRunning: false } })
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('https://github.com/taylorcaton')
    expect(hrefs).toContain('https://www.linkedin.com/in/taylorcaton/')
  })

  it('emits hyperSpeed with the expected speeds on hover and focus interactions', async () => {
    const wrapper = mount(Portfolio, { props: { isRunning: false } })
    const wave = wrapper.find('.title span')

    await wave.trigger('mouseover')
    await wave.trigger('focus')
    await wave.trigger('mouseleave')
    await wave.trigger('blur')

    expect(wrapper.emitted('hyperSpeed')).toEqual([[0.8], [0.4], [0.1], [0.1]])
  })

  it('initializes the typewriter effect against the #typewriter element on mount', () => {
    mount(Portfolio, { props: { isRunning: true } })
    expect(Typewriter).toHaveBeenCalledWith('#typewriter', expect.objectContaining({ delay: 70 }))
  })
})
