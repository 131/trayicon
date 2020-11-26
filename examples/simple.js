"use strict";

const Tray = require('trayicon');

Tray.create(function(tray) {
  let main = tray.item("Power");
  main.add(tray.item("Café on"), tray.item("on"));

  let quit = tray.item("Quit", () => tray.kill());
  tray.setMenu(main, quit);
});


