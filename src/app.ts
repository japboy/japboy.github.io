import { createElement } from 'react'
import { render } from 'react-dom'

import Hello from './components/Hello'

import './app.css'

render(createElement(Hello), document.body)
