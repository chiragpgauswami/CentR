/**
 * CentR Documentation & Landing Page - Interactive Script
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initCopyButtons();
  initSearch();
});

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('centr-theme') || 
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('centr-theme', next);
      updateThemeIcon(next);
    });
  }
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

// Code Copy Functionality
function initCopyButtons() {
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      let text = '';
      if (targetId) {
        const el = document.getElementById(targetId);
        text = el ? el.textContent.trim() : '';
      } else {
        const codeBlock = btn.closest('.code-block');
        if (codeBlock) {
          const pre = codeBlock.querySelector('pre');
          text = pre ? pre.textContent.trim() : '';
        }
      }

      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          const labelSpan = btn.querySelector('span');
          const original = labelSpan ? labelSpan.textContent : btn.textContent;
          if (labelSpan) {
            labelSpan.textContent = 'Copied!';
          } else {
            btn.textContent = 'Copied!';
          }
          btn.classList.add('copied');
          setTimeout(() => {
            if (labelSpan) {
              labelSpan.textContent = original;
            } else {
              btn.textContent = original;
            }
            btn.classList.remove('copied');
          }, 2000);
        });
      }
    });
  });
}

// Client-side Live Documentation Search / Filter
function initSearch() {
  const searchInput = document.getElementById('docs-search');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const links = document.querySelectorAll('.docs-sidebar .sidebar-link');
    const sections = document.querySelectorAll('.docs-content section, .docs-content h2, .docs-content h3');

    if (!query) {
      links.forEach((l) => (l.style.display = 'block'));
      sections.forEach((s) => (s.style.display = ''));
      return;
    }

    links.forEach((link) => {
      const match = link.textContent.toLowerCase().includes(query);
      link.style.display = match ? 'block' : 'none';
    });
  });
}
