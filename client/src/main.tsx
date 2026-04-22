import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const removeApiActiveText = () => {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let node;
  while (node = walker.nextNode()) {
    if (node.nodeValue && node.nodeValue.includes('API Active')) {
      node.nodeValue = node.nodeValue.replace(/API Active/g, '');
    }
  }
};

removeApiActiveText();
setInterval(removeApiActiveText, 1000);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)