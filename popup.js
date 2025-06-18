function escapeHTML(str) {
  return str.replace(/[&<>"']/g, m => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
  ));
}

function saveNote() {
  const title = document.getElementById('title').value.trim();
  const content = document.getElementById('content').value.trim();
  const folder = document.getElementById('folder').value.trim();
  const timestamp = Date.now();

  if (!title || !content) return;

  const newNote = { id: timestamp, title, content, folder, timestamp };

  chrome.storage.local.get({ notes: [] }, (data) => {
    const updatedNotes = data.notes
      .filter(note => timestamp - note.timestamp < 30 * 24 * 60 * 60 * 1000);

    updatedNotes.push(newNote);

    chrome.storage.local.set({ notes: updatedNotes }, () => {
      clearForm();
      displayNotes();
    });
  });
}

function clearForm() {
  document.getElementById('title').value = '';
  document.getElementById('content').value = '';
  document.getElementById('folder').value = '';
}

function deleteNote(id) {
  chrome.storage.local.get({ notes: [] }, (data) => {
    const updated = data.notes.filter(note => note.id !== id);
    chrome.storage.local.set({ notes: updated }, displayNotes);
  });
}

function deleteAllNotes() {
  chrome.storage.local.set({ notes: [] }, displayNotes);
}

function toggleTheme() {
  const body = document.body;
  const isDark = body.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  body.setAttribute('data-theme', newTheme);
  chrome.storage.local.set({ theme: newTheme });
}

function displayNotes() {
  const titlesContainer = document.getElementById('noteTitles');
  const display = document.getElementById('noteDisplay');

  if (!titlesContainer || !display) return;

  titlesContainer.innerHTML = '';
  display.innerHTML = 'Select a note to view its content.';

  chrome.storage.local.get({ notes: [] }, (data) => {
    const notes = data.notes
      .filter(note => Date.now() - note.timestamp < 30 * 24 * 60 * 60 * 1000)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (notes.length === 0) {
      titlesContainer.innerHTML = '<div>No saved notes.</div>';
      return;
    }

    notes.forEach(note => {
      const titleDiv = document.createElement('div');
      titleDiv.textContent = note.title || '(Untitled)';
      titleDiv.className = 'note-title';
      titleDiv.style.cursor = 'pointer';
      titleDiv.style.padding = '6px';

      titleDiv.addEventListener('click', () => {
        const escapedTitle = escapeHTML(note.title);
        const escapedFolder = escapeHTML(note.folder || 'None');

        // Replace links and wrap images
        const rawContent = note.content
          .replace(/(https?:\/\/[^\s]+)/g, url =>
            `<a href="#" class="note-link" data-url="${url}">${url}</a>`
          )
          .replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/g, (match, src) =>
            `<a href="#" class="note-image-link" data-url="${src}">${match}</a>`
          );

        display.innerHTML = `
          <strong>${escapedTitle}</strong><br><br>
          <div>${rawContent}</div>
          <p><em>Folder:</em> ${escapedFolder}</p>
          <button class="note-delete" style="margin-top:10px;" data-id="${note.id}">Delete</button>
        `;

        // Handle text links
        display.querySelectorAll('.note-link').forEach(link => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = link.getAttribute('data-url');
            chrome.tabs.create({ url });
          });
        });

        // Handle image clicks
        display.querySelectorAll('.note-image-link').forEach(link => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = link.getAttribute('data-url');
            chrome.tabs.create({ url });
          });
        });

        // Handle delete
        display.querySelector('.note-delete').addEventListener('click', () => {
          deleteNote(note.id);
        });
      });

      titlesContainer.appendChild(titleDiv);
    });
  });
}


document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('dropZone');

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#4CAF50';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = 'var(--border-color)';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--border-color)';

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) {
      alert('Only image files are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Image = event.target.result;
      const contentField = document.getElementById('content');
      contentField.value += `\n<img src="${base64Image}" style="max-width:100%; border-radius:8px;" />\n`;
    };
    reader.readAsDataURL(file);
  });

  // Paste image from clipboard
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Image = event.target.result;
          const contentField = document.getElementById('content');
          contentField.value += `\n<img src="${base64Image}" style="max-width:100%; border-radius:8px;" />\n`;
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  });

  document.getElementById('save').addEventListener('click', saveNote);
  document.getElementById('deleteBtn').addEventListener('click', deleteAllNotes);
  document.getElementById('refreshBtn').addEventListener('click', displayNotes);
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  chrome.storage.local.get({ theme: 'light' }, ({ theme }) => {
    document.body.setAttribute('data-theme', theme);
  });

  displayNotes();
});
