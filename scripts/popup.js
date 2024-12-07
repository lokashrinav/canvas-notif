document.getElementById('save').addEventListener('click', () => {
  const token = document.getElementById('token').value;
  chrome.storage.sync.set({ token }, () => {
    alert('Token saved successfully!');
  });
});

document.getElementById('show-assignments').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'fetchAssignments' }, (response) => {
    const assignmentsList = document.getElementById('assignments-list');
    assignmentsList.innerHTML = '';
    if (response && response.assignments && response.assignments.length > 0) {
      response.assignments.forEach((assignment) => {
        const dueDate = new Date(assignment.due_at).toLocaleString();
        const item = document.createElement('div');
        item.textContent = `${assignment.name} - Due: ${dueDate}`;
        assignmentsList.appendChild(item);
      });
    } else {
      assignmentsList.textContent = 'No assignments found.';
    }
  });
});