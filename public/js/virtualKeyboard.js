/**
 * Touch-Friendly Virtual Keyboard for Email Entry
 */
class VirtualKeyboard {
  constructor(containerElement, inputDisplayElement, onEnterCallback) {
    this.container = containerElement;
    this.display = inputDisplayElement;
    this.onEnter = onEnterCallback;
    this.value = '';
    this.init();
  }

  init() {
    const layout = [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', '@'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', '_', '-'],
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['@gmail.com', '@yahoo.com', 'BACKSPACE', 'CLEAR', 'KIRIM']
    ];

    this.container.innerHTML = '';

    layout.forEach(rowKeys => {
      const row = document.createElement('div');
      row.className = 'vk-row';

      rowKeys.forEach(key => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vk-key';

        if (key === 'BACKSPACE') {
          btn.innerHTML = '⌫';
          btn.classList.add('wide');
          btn.onclick = () => this.backspace();
        } else if (key === 'CLEAR') {
          btn.innerHTML = 'HAPUS';
          btn.classList.add('wide');
          btn.onclick = () => this.clear();
        } else if (key === 'KIRIM') {
          btn.innerHTML = 'KIRIM';
          btn.classList.add('wide');
          btn.style.background = 'linear-gradient(135deg, #6366f1, #a855f7)';
          btn.onclick = () => {
            if (this.onEnter) this.onEnter(this.value);
          };
        } else if (key.startsWith('@')) {
          btn.textContent = key;
          btn.classList.add('domain-key');
          btn.onclick = () => this.appendDomain(key);
        } else {
          btn.textContent = key;
          btn.onclick = () => this.appendChar(key);
        }

        row.appendChild(btn);
      });

      this.container.appendChild(row);
    });

    this.updateDisplay();
  }

  appendChar(char) {
    this.value += char;
    this.updateDisplay();
  }

  appendDomain(domain) {
    if (!this.value.includes('@')) {
      this.value += domain;
    } else {
      // Replace existing domain after @
      const atIdx = this.value.indexOf('@');
      this.value = this.value.substring(0, atIdx) + domain;
    }
    this.updateDisplay();
  }

  backspace() {
    this.value = this.value.slice(0, -1);
    this.updateDisplay();
  }

  clear() {
    this.value = '';
    this.updateDisplay();
  }

  setValue(val) {
    this.value = val || '';
    this.updateDisplay();
  }

  updateDisplay() {
    this.display.textContent = this.value || 'masukkan.email@anda.com';
    this.display.style.opacity = this.value ? '1' : '0.5';
  }
}

window.VirtualKeyboard = VirtualKeyboard;
