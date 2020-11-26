"use strict";

const Tray = require('trayicon');

class test {

  async run() {

    let w =  {name : "W: (webtest-ivs)", automount : true, mounted : true};
    let z =  {name : "Z: (webtest-ivs)", automount : false, mounted : true};


    var toggle_auto = function(drive) {
      drive.automount = !drive.automount;
      redraw();
    };

    var mount = function(drive) {
      drive.mounted = true;
      redraw();
      tray.notify("On action", `Drive ${drive.name} mounted`);
    };

    var unmount = function(drive) {
      drive.mounted = false;
      redraw();
      tray.notify("On action", `Drive ${drive.name} unmounted`);
    };


    const tray = await Tray.create({
      action : function() {
        console.log("Clicked on main icon");
      },
      title : "foo de bar",
    });


    var build = (drive) => {
      let i = tray.item(drive.name, {bold : true});

      if(drive.mounted) {
        i.add(
          tray.item("(currently mounted)", {disabled : true}),
          tray.item("Unmount volume", {action : unmount.bind(null, drive)})
        );
      } else {
        i.add(tray.item("(currently unmounted)", {disabled : true}));
        i.add(tray.item("Mount volume", {action : mount.bind(null, drive)}));
      }

      i.add(tray.item("Automount volume", {checked : drive.automount, action : toggle_auto.bind(null, drive)}));
      return i;
    };

    var redraw = () => {
      let quit = tray.item("Quit", () => {
        tray.kill();
      });

      tray.setMenu(
        build(w),
        tray.separator(),
        build(z),

        tray.separator(),
        quit,
      );
    };

    tray.setTitle("nope");

    redraw();


  }
}




module.exports = test;


