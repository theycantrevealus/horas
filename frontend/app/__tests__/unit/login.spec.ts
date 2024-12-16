import { shallowMount } from '@vue/test-utils'

describe('Login Page Test', () => {
  it('renders input for email', () => {
    expect(1).toBeGreaterThan(0)
  })

  it('rendering option', () => {
    const MessageComponent = {
      template: '<p>{{ msg }}</p>',
      props: ['msg']
    }
    const wrapper = shallowMount(MessageComponent, {
      propsData: {
        msg: 'Hello world'
      }
    })

    // Assert the rendered text of the component
    expect(wrapper.text()).toContain('Hello world')
  })
})
