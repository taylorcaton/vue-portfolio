import { describe, it, expect } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import App from '../App.vue'
import Portfolio from '../components/Portfolio.vue'
import StarField from '../components/StarField.vue'

describe('App', () => {
  it('starts with the animation running', () => {
    const wrapper = shallowMount(App)
    expect(wrapper.vm.isRunning).toBe(true)
    expect(wrapper.findComponent(StarField).props('isRunning')).toBe(true)
  })

  it('toggles isRunning when the toggle button is clicked', async () => {
    const wrapper = shallowMount(App)
    const button = wrapper.find('button.toggle-stars')
    expect(button.classes()).toContain('is-dark')

    await button.trigger('click')

    expect(wrapper.vm.isRunning).toBe(false)
    expect(button.classes()).toContain('is-black')
  })

  it('passes the speed from Portfolio hyper-speed events through to StarField', async () => {
    const wrapper = shallowMount(App)
    const portfolio = wrapper.findComponent(Portfolio)

    await portfolio.vm.$emit('hyper-speed', 0.8)

    expect(wrapper.vm.starSpeed).toBe(0.8)
    expect(wrapper.findComponent(StarField).props('starSpeed')).toBe(0.8)
  })
})
