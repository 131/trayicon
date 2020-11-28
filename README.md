[![Build Status](https://travis-ci.com/131/trayicon.svg?branch=master)](https://travis-ci.com/131/trayicon)
[![Version](https://img.shields.io/npm/v/trayicon.svg)](https://www.npmjs.com/package/trayicon)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](http://opensource.org/licenses/MIT)
[![Code style](https://img.shields.io/badge/code%2fstyle-ivs-green.svg)](https://www.npmjs.com/package/eslint-plugin-ivs)
![Available platform](https://img.shields.io/badge/platform-win32-blue.svg)


# Motivation
[trayicon](https://github.com/131/trayicon) provide you system tray icon for your nodejs application.


# Usage example
```
const Tray = require('trayicon');

Tray.create(function(tray) {
  let main = tray.item("Power");
  main.add(tray.item("on"), tray.item("on"));

  let quit = tray.item("Quit", () => tray.kill());
  tray.setMenu(main, quit);
});
```


# API

## (Promise <Tray>) tray.create({icon, title, action} [, readyCb])
Create a new Tray instance, return a promise / emit a callback when the trayicon is ready.
If defined, `action` callback is triggered when double clicking the tray.

## (void) tray.setTitle(tray title)
Set the systray title.

## (void) tray.setIcon(binary icon buffer)
Set the systray icon.

## (void) tray.notify("Some title", "Some message")
Display a notification balloon.

## (void) tray.setMenu(...items)
Set the systray menu.

## (Item) tray.item("foo", { ?checked : boolean, ?disabled : boolean, ?bold : boolean, ?action : `function`})
Create a menu item. If defined, the `action` callback is triggered when the item is selected. 

## (void) parentItem.add(...childrenItems)
Create a submenu of childrenItems under parentItem.

## (Item) tray.separator();
Create an item of type "separator"


## Extra features
* Work when running node as SYSTEM\NT authority (*trayicon* will fallback to interactive session if needed)


# Credits 
* [131](https://github.com/131)
* [murrayju](https://github.com/murrayju/CreateProcessAsUser)
