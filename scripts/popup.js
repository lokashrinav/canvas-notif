document.getElementById('save').addEventListener('click', () => {
    const token = document.getElementById('token').value;
    chrome.storage.sync.set({ token }, () => {
      alert('Token saved successfully!');
    });
  });
  