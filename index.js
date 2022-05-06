"use strict";

const path = require('path');
const fs  = require('fs');
const os = require('os');
const net = require('net');
const EventEmitter = require('events');

const debug = require('debug');

const {spawn} = require('child_process');

const {escapeXML, attrs, defer, uuid, md5} = require('./utils');

const DEFAULT_ICON_PATH = path.resolve(__dirname, 'rsrcs', 'default.ico');
const TRAYAPP_PATH      = path.resolve(__dirname, 'rsrcs', 'trayicon.exe');

//const TRAYAPP_PATH      = path.resolve(__dirname, 'src/bin/Debug/trayicon.exe');

const XML_HEAD =  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n`;

const ITEM_TYPE_SEPARATOR = 'separator';

const logger = {
  error : debug('trayicon:error'),
  info  : debug('trayicon:info')
};

class Tray extends EventEmitter {

  constructor(opts = {}) {
    super();

    this.cbs = {};

    this.uid   = uuid();

    this.title = opts.title || "Hi";
    this.icon  = opts.icon  || fs.readFileSync(DEFAULT_ICON_PATH);
    this.debug = opts.debug;

    this.setAction (opts.action || Function.prototype);

    this.client = null;

    this.connected = new Promise(resolve => this.on("connected", resolve));

    this._useTempDir = opts.useTempDir;
    this.trayAppPath = TRAYAPP_PATH;
  }

  static async create(opts, ready) {
    if(typeof opts == "function")
      (ready = opts), (opts = {});

    let tray = new Tray(opts);

    if(tray._useTempDir) {
      await new Promise((resolve, reject) => {
        // Keep temp name stable so pinned tray icons stay pinned
        let executableName = path.basename(process.execPath, '.exe');
        let computedId = md5(executableName + opts.title);
        let filename = `${executableName}-trayicon-${computedId}.exe`;
        let tmppath = path.join(os.tmpdir(), filename);

        tray.trayAppPath = tmppath;

        if(fs.existsSync(tmppath)) {
          resolve();
        } else {
          // `fs.copyFileSync` doesn't work with pkg
          let rd = fs.createReadStream(TRAYAPP_PATH);
          let wr = fs.createWriteStream(tmppath);
          wr.on("error", reject);
          wr.on("close", resolve);
          rd.pipe(wr);
        }
      });
    }

    tray._connect();

    if(ready)
      tray.on('connected', ready);
    return await tray.connected;
  }


  async _connect() {

    let port = 0;

    if(this.debug)
      port = 5678;

    let defered = defer();
    let server = net.createServer(defered.resolve);

    port = await new Promise(resolve =>
      server.listen(port, '127.0.0.1', () => resolve(server.address().port))
    );


    logger.info("Server listening on port", port);

    if(!this.debug) {
      logger.info("Spawning", this.trayAppPath, [port]);
      let child = spawn(this.trayAppPath, [port]);
      //child.stdout.pipe(process.stdout);
      //child.stderr.pipe(process.stderr);

      child.on('exit', (code) => {
        if(code !== 0) {
          logger.error("Error on %s (exit %d)", this.trayAppPath, code);
          this.emit('error', `Invalid exit code ${code}`);
        }
        if(this.client)
          this.client.end();
        if(this._useTempDir === "clean")
          fs.unlinkSync(this.trayAppPath);
        server.close();
      });
    }

    logger.info("Waiting for client");

    this.client = await defered;
    this.client.on('error', () => {
      server.close();
    }); //on disconnect
    logger.info("Got client");

    this.client.on("data", this._dispatch.bind(this));
    this.emit("connected", this);
    this._draw();
  }

  register(cid, target) {
    this.cbs[cid] = target;
  }

  setTitle(title) {
    this.title = title;
    this._draw();
  }

  setIcon(icon) {
    this.icon = icon;
    this._draw();
  }

  setAction(action) {
    if(action)
      this.register(this.uid, {action});
  }


  _draw() {
    if(!this.client)
      return;  //no need to redraw if not connected

    let payload = this.asXML();

    this.client.write(payload);
    this.client.write(Buffer.from([0]));
  }

  notify(title, msg, action) {
    const uid = uuid();
    let args = {
      uid,
      title : title || "-",
      timeout : 5000,
      style : 'info', //warn, error
    };
    let payload = XML_HEAD;
    payload += `<notify ${attrs(args)}>\n`;
    payload += `<msg>${escapeXML(msg || "-")}</msg>\n`;
    payload += `</notify>`;

    this.register(uid, {action});
    this.client.write(payload);
    this.client.write(Buffer.from([0])); //null byte
  }

  setMenu(...items) {
    let payload = XML_HEAD;
    payload += `<menu>\n`;
    for(var item of items)
      payload += item.asXML() + `\n`;
    payload += `</menu>`;

    this.client.write(payload);
    this.client.write(Buffer.from([0])); //null byte
  }


  asXML() {
    let payload = XML_HEAD;

    payload += `<tray ${attrs(this, ['title', 'uid'])}>\n`;
    payload += `<icon>${this.icon.toString('base64')}</icon>\n`;
    payload += `</tray>`;

    return payload;
  }



  _dispatch(msg) {
    let cid = msg.toString();

    let target = this.cbs[cid];
    if(target && target.action)
      target.action();
  }

  kill() {
    this.client.end();
  }


  separator() {
    return new Item({type : ITEM_TYPE_SEPARATOR});
  }

  item(...args) {
    let item = new Item(...args);
    this.cbs[item.uid] = item;
    return item;
  }



}

const ITEM_OPTIONS = ["disabled", "checked", "bold", "type"];

class Item {

  constructor(label, props = {}) {
    if(typeof label == "object")
      (props = label), (label = "-");
    if(typeof props == "function")
      props = {action : props};

    this.uid = uuid();

    this.action   = props.action || (() => {});
    this.label    = label;
    this.items = [];

    for(let opt of ITEM_OPTIONS)
      this[opt] = props[opt];

  }

  add(...items) {
    this.items.push(...items);
  }

  asXML() {
    let args = ["label", "uid", ...ITEM_OPTIONS];
    let body = `<item ${attrs(this, args)}`;

    if(this.items.length) {
      body += `>\n`;
      for(var item of this.items)
        body += item.asXML() + `\n`;
      body += `</item>`;
    } else  {body += `/>`;}

    return body;
  }
}


module.exports = {create : Tray.create};
