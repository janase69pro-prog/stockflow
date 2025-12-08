import '@testing-library/jest-dom'

// Mock global de ResizeObserver (necesario para algunos componentes UI modernos)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock de scrollIntoView (que no existe en JSDOM)
window.HTMLElement.prototype.scrollIntoView = jest.fn()
