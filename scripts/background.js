console.log('Background script loaded');

async function fetchCourses(token) {
  try {
    const response = await fetch('https://canvas.instructure.com/api/v1/courses', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const courses = await response.json();
    console.log('Fetched courses:', courses);
    return courses;
  } catch (error) {
    console.error('Error fetching courses:', error);
    return [];
  }
}

async function fetchAssignmentsForCourse(courseId, token) {
  try {
    const response = await fetch(`https://canvas.instructure.com/api/v1/courses/${courseId}/assignments`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const assignments = await response.json();
    console.log(`Fetched assignments for course ${courseId}:`, assignments);
    return assignments;
  } catch (error) {
    console.error(`Error fetching assignments for course ${courseId}:`, error);
    return [];
  }
}

async function fetchCoursePages(courseId, token) {
  try {
    const response = await fetch(`https://canvas.instructure.com/api/v1/courses/${courseId}/pages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const pages = await response.json();
    console.log(`Fetched pages for course ${courseId}:`, pages);
    return pages;
  } catch (error) {
    console.error(`Error fetching pages for course ${courseId}:`, error);
    return [];
  }
}

async function fetchPageContent(url, token) {
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const html = await response.text();
    console.log(`Fetched page content from ${url}`);
    return html;
  } catch (error) {
    console.error(`Error fetching page content from ${url}:`, error);
    return '';
  }
}

function parseHTMLContent(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const textContent = doc.body.textContent || '';
  console.log('Parsed HTML content:', textContent);
  return textContent;
}

async function fetchAllAssignments(token) {
  const courses = await fetchCourses(token);
  let allAssignments = [];
  for (const course of courses) {
    const assignments = await fetchAssignmentsForCourse(course.id, token);
    allAssignments = [...allAssignments, ...assignments];

    const pages = await fetchCoursePages(course.id, token);
    for (const page of pages) {
      const pageContent = await fetchPageContent(page.html_url, token);
      const textContent = parseHTMLContent(pageContent);
      // Extract due dates and links from textContent
      // Add logic to follow links and fetch content if necessary
    }
  }
  console.log('All fetched assignments:', allAssignments);
  return allAssignments;
}

function showWeeklyNotification(assignments) {
  const maxItems = 5; // Maximum items to display in the notification
  const items = assignments.slice(0, maxItems).map((assignment) => ({
    title: assignment.name,
    message: `Due: ${new Date(assignment.due_at).toLocaleString()}`,
  }));

  let message = 'Upcoming assignments due this week:';
  if (assignments.length > maxItems) {
    message += ` And ${assignments.length - maxItems} more...`;
  }

  chrome.notifications.create({
    type: 'list',
    iconUrl: chrome.runtime.getURL('images/icon.png'),
    title: 'Assignments Due This Week',
    message: message,
    items: items,
    priority: 2,
  }, (notificationId) => {
    if (chrome.runtime.lastError) {
      console.error('Notification error:', chrome.runtime.lastError);
    } else {
      console.log('Weekly notification shown:', notificationId);
    }
  });
}

async function checkAssignments() {
  console.log('Checking assignments...');
  chrome.storage.sync.get('token', async ({ token }) => {
    if (!token) {
      console.log('No Canvas token found.');
      return;
    }
    console.log('Canvas token found:', token);
    const assignments = await fetchAllAssignments(token);
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    const upcomingAssignments = assignments.filter((assignment) => {
      const dueDate = new Date(assignment.due_at);
      return dueDate >= now && dueDate <= nextWeek;
    });

    if (upcomingAssignments.length > 0) {
      console.log('Assignments due this week:', upcomingAssignments);
      showWeeklyNotification(upcomingAssignments);
    } else {
      console.log('No assignments due this week.');
    }
  });
}

// Schedule the weekly alarm
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed, setting up weekly alarm...');
  chrome.alarms.create('weeklyAssignmentCheck', {
    periodInMinutes: 10080, // 7 days * 24 hours * 60 minutes
  });
});

// Listen for the weekly alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'weeklyAssignmentCheck') {
    console.log('Weekly alarm triggered');
    checkAssignments();
  }
});

// Trigger the assignment check when the token changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.token) {
    console.log('Token changed, checking assignments...');
    checkAssignments();
  }
});

// Handle messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchAssignments') {
    chrome.storage.sync.get('token', async ({ token }) => {
      if (!token) {
        sendResponse({ assignments: [] });
        return;
      }
      const assignments = await fetchAllAssignments(token);
      sendResponse({ assignments });
    });
    return true; // Indicates async response
  }
});