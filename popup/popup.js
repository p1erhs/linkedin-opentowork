const box = document.getElementById("toggle");

chrome.storage.sync.get({ botEnabled: true }, ({ botEnabled }) => {
  box.checked = botEnabled;
});

box.addEventListener("change", () => {
  chrome.storage.sync.set({ botEnabled: box.checked });
});
