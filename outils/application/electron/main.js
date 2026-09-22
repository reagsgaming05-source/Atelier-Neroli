// Blonay PDF — fenêtre d'application.
// Le traitement des documents se fait entièrement dans la page, hors ligne.
const { app, BrowserWindow, Menu, session, dialog } = require('electron');
const path = require('path');

app.setAppUserModelId('ch.atelier-neroli.blonay-pdf');
Menu.setApplicationMenu(null);

// Une seule fenêtre : un second lancement réveille celle qui est ouverte.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });

  function createWindow() {
    const win = new BrowserWindow({
      width: 1500,
      height: 950,
      minWidth: 880,
      minHeight: 560,
      title: 'Blonay PDF',
      backgroundColor: '#2A2E35',
      icon: path.join(__dirname, 'icon.png'),
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        spellcheck: false,
        devTools: false,
      },
    });
    win.removeMenu();
    win.once('ready-to-show', () => win.show());

    // Fermeture : message de l'application, pas celui d'un navigateur.
    let quitter = false;
    win.webContents.on('will-prevent-unload', e => e.preventDefault());
    win.on('close', e => {
      if (quitter) return;
      e.preventDefault();
      (async () => {
        let modifie = false;
        try {
          modifie = await win.webContents.executeJavaScript("!!document.querySelector('#summary .mod')");
        } catch (_) {}
        if (!modifie) { quitter = true; win.close(); return; }
        const { response } = await dialog.showMessageBox(win, {
          type: 'warning',
          buttons: ['Revenir au document', 'Quitter sans exporter'],
          defaultId: 0,
          cancelId: 0,
          title: 'Blonay PDF',
          message: 'Des modifications n\'ont pas été exportées.',
          detail: 'En quittant maintenant, vous les perdez.',
          noLink: true,
        });
        if (response === 1) { quitter = true; win.close(); }
      })();
    });
    win.loadFile(path.join(__dirname, 'index.html'));
    // rien ne s'ouvre en dehors de la fenêtre
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    win.webContents.on('will-navigate', e => e.preventDefault());
    return win;
  }

  app.whenReady().then(() => {
    // l'application ne doit joindre personne
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const u = details.url;
      const local = u.startsWith('file://') || u.startsWith('blob:') || u.startsWith('data:') || u.startsWith('devtools:');
      callback({ cancel: !local });
    });
    // enregistrement d'un fichier : boîte de dialogue Windows habituelle
    session.defaultSession.on('will-download', (event, item) => {
      item.setSaveDialogOptions({ title: 'Enregistrer le document', defaultPath: item.getFilename() });
    });
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on('window-all-closed', () => app.quit());
}
