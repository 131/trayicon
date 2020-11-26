"use strict";

const Tray = require('trayicon');


Tray.create(function(tray) {

  let main = tray.item("Power");
  main.add(tray.item("on", {bold : true}), tray.item("off"));

  let quit = tray.item("Exit", () => tray.kill());
  tray.setMenu(main, quit);

});


