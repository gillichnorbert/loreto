// Az Electron alap moduljainak importálása
const { app, BrowserWindow } = require('electron');
const path = require('path');

// Globális referencia az ablak objektumra (a GC elkerülése végett)
let mainWindow;

function createWindow() {
  // Hozd létre a böngésző ablakot.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false, // Biztonsági okokból ajánlott
      contextIsolation: true, // Biztonsági okokból ajánlott
    },
  });

  // Töltsd be az Angular alkalmazásodat.
  // Ez a legfontosabb rész!
  // Az 'ng build' parancs után fogja betölteni a statikus index.html fájlt.
  mainWindow.loadURL(
    `file://${__dirname}/dist/loretomotor/browser/index.html`
  );

  // Opcionális: Fejlesztői eszközök megnyitása
  // mainWindow.webContents.openDevTools();

  // Akkor hívódik meg, ha az ablakot bezárják.
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Ez a metódus akkor hívódik meg, ha az Electron inicializációja kész.
app.on('ready', createWindow);

// Kilép, ha minden ablak bezárult (kivéve macOS)
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // macOS specifikus: Hozd létre újra az ablakot, ha a dokk-ikonra kattintanak
  if (mainWindow === null) {
    createWindow();
  }
});