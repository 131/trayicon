using murrayju.ProcessExtensions;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using System.Xml;
using Utils;

namespace TrayIcon
{


    static class Program
    {

        public static NotifyIcon trayIcon;
        public static TrayContext ctx;

        /// <summary>
        /// The main entry point for the application.
        /// </summary>
        [STAThread]
        static void Main(string[] args)
        {
            if(isService())
            {
                var me = System.Reflection.Assembly.GetExecutingAssembly().Location;
                uint exitCode;

                PROCESS_INFORMATION pInfo = ProcessExtensions.StartProcessAsCurrentUser(me, null, String.Join(" ", args));
                Kernel32.WaitForSingleObject(pInfo.hProcess, Kernel32.INFINITE);
                Kernel32.GetExitCodeProcess(pInfo.hProcess, out exitCode);
                Kernel32.CloseHandle(pInfo.hThread);
                Kernel32.CloseHandle(pInfo.hProcess);
                Environment.Exit((int)exitCode);
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            ctx = new TrayContext(args);
            Application.Run(ctx);
        }

        static bool isService()
        {
            string userName = System.Security.Principal.WindowsIdentity.GetCurrent().User.Value;
            return userName == "S-1-5-18" || userName == "S-1-5-19" || userName == "S-1-5-20";
        }


    }

        public class TrayContext : ApplicationContext
    {
        private delegate void ProcessMsgDelegate(string xmlBody);
        static internal Control Anchor; //to help sync in ApplicationContext
        private static TcpClient client;
        private static string BalloonTipTag;

        
        public TrayContext(string[] args)
        {
            Int32 port = 0;
            if (args.Length == 1)
                port = Int32.Parse(args[0]);
            if (port == 0)
                throw new Exception("Invalid port");


            Console.Error.WriteLine("Got port {0}", port);
            Application.ApplicationExit += Application_ApplicationExit;
            Application.ThreadException += Application_ThreadException;

            Program.trayIcon = new NotifyIcon();
            Program.trayIcon.BalloonTipClicked += TrayIcon_BalloonTipClicked;
            Program.trayIcon.DoubleClick += TrayIcon_Click;

            Anchor = new Control();
            var x = Anchor.Handle; //force handle creation, allow begininvoke

            StartClient(port);
        }


        private void Application_ApplicationExit(object sender, EventArgs e)
        {
            Program.trayIcon.Dispose();

        }

        private static void Application_ThreadException(object sender, System.Threading.ThreadExceptionEventArgs e)
        {
            Console.Error.Write(e.Exception.Message);
            Program.trayIcon.Dispose();

            Environment.Exit(1);
            Application.Exit();
        }


        private static void BuildTray(XmlElement root)
        {
            Program.trayIcon.Visible = true;
            XmlNode icon_node = root.SelectSingleNode("icon");
            byte[] icon_body = Convert.FromBase64String(icon_node.InnerText);

            Program.trayIcon.Text = root.GetAttribute("title");
            Program.trayIcon.Tag  = root.GetAttribute("uid");

            using (var ms = new MemoryStream(icon_body))
            {
                Program.trayIcon.Icon = new Icon(ms);
            }
        }

        private static void BuildMenu(XmlNode root)
        {
            var contextMenuStrip1 = new ContextMenuStrip();
            contextMenuStrip1.Items.AddRange(BuildStrip(root));
            Program.trayIcon.ContextMenuStrip = contextMenuStrip1;
        }
        public class StateObject
        {
            // Client socket.  
            public Socket workSocket = null;
            // Size of receive buffer.  
            public const int BufferSize = 256;
            // Receive buffer.  
            public byte[] buffer = new byte[BufferSize];
            // Received data string.  
            public StringBuilder sb = new StringBuilder();
        }

        private static void ProcessMsg(string xmlBody)
        {
            //Console.Error.Write("Got msg " + xmlBody);

            XmlDocument doc = new XmlDocument();
            doc.LoadXml(xmlBody);

            XmlElement root = doc.DocumentElement;
            if (root.Name == "menu")
                BuildMenu(root);

            if (root.Name == "tray")
                BuildTray(root);

            if (root.Name == "notify") {
                string title = root.GetAttribute("title");
                string msg = root.SelectSingleNode("msg").InnerText;
                int timeout = Convert.ToInt32(root.GetAttribute("timeout"));
                BalloonTipTag = root.GetAttribute("uid");
                Program.trayIcon.ShowBalloonTip(timeout, title, msg, ToolTipIcon.Info);
            }
        }


        private void TrayIcon_Click(object sender, EventArgs e)
        {
            var uid = ((NotifyIcon)sender).Tag.ToString();
            Send(uid);
        }

        private static void TrayIcon_BalloonTipClicked(object sender, EventArgs e)
        {
            Send(BalloonTipTag);
        }

        private static void ReceiveCallback(IAsyncResult ar)
        {

            // Retrieve the state object and the client socket
            // from the asynchronous state object.  
            StateObject state = (StateObject)ar.AsyncState;
            Socket client = state.workSocket;
            // Read data from the remote device.  
            int bytesRead = client.EndReceive(ar);

            if (bytesRead > 0)
            {
                var start = 0;
                do
                {
                    var pos = Array.IndexOf(state.buffer, (byte)0, start);

                    if (pos != -1 && pos < bytesRead)
                    {
                        //end separator, full payload availabled
                        state.sb.Append(Encoding.ASCII.GetString(state.buffer, start, pos - start));
                        string msg = state.sb.ToString();
                        state.sb = new StringBuilder();
                        //send message to UI deletage
                        if (Anchor.InvokeRequired) {
                            var d = new ProcessMsgDelegate(ProcessMsg);
                            Anchor.Invoke(d, new object[] { msg });
                        } else {
                            ProcessMsg(msg);
                        }
                        start = pos + 1;
                    } else {
                        state.sb.Append(Encoding.ASCII.GetString(state.buffer, start, bytesRead - start));
                        break;
                    }
                } while (true);

                client.BeginReceive(state.buffer, 0, StateObject.BufferSize, 0,
                       new AsyncCallback(ReceiveCallback), state);
            }
        }

        public static void StartClient(int port)
        {
            // Connect to a remote device.  

            Console.Error.WriteLine("Connecting to {0}", port);
            client = new TcpClient();
            client.Connect(new IPEndPoint(IPAddress.Loopback, port));

            Console.Error.WriteLine("Connected to {0}", port);
            Console.Error.WriteLine("Begin receive loop");

            // Create the state object.  
            StateObject state = new StateObject();
            state.workSocket = client.Client;

            Thread myThread = new Thread(() => MonitorSocket(client.Client));
            myThread.Start();


            // Begin receiving the data from the remote device.  
            client.Client.BeginReceive(state.buffer, 0, StateObject.BufferSize, 0,
                new AsyncCallback(ReceiveCallback), state);
        }

        public static void MonitorSocket(Socket lnk)
        {
            while (SocketExtensions.IsConnected(lnk))
                Thread.Sleep(200);
            //Program.trayIcon.;
            //Program.trayIcon.Dispose();
            Application.Exit();
        }

        public static void Send(string msg)
        {
            client.Client.Send(Encoding.UTF8.GetBytes(msg));
        }


        private static ToolStripItem BuildItem(XmlElement item_node)
        {
            var item_type = item_node.GetAttribute("type");
            if (String.IsNullOrEmpty(item_type))
                item_type = "default";

            if (item_type == "separator")
                return new ToolStripSeparator();

            var item_strip = new ToolStripMenuItem();
            if (item_node.HasAttribute("checked"))
            {
                item_strip.CheckOnClick = true; //checkable
                item_strip.Checked = toBool(item_node.Attributes["checked"].Value);
            }

            item_strip.Enabled = !toBool(item_node.GetAttribute("disabled"));

            item_strip.Text = item_node.Attributes["label"].Value;
            if (item_node.ChildNodes.Count > 0)
                item_strip.DropDownItems.AddRange(BuildStrip(item_node));

            item_strip.Tag = item_node.GetAttribute("uid");
            item_strip.Click += Item_strip_Click;
            return item_strip;
        }

        private static void Item_strip_Click(object sender, EventArgs e)
        {
            Send(((ToolStripItem) sender).Tag.ToString() );
        }

        private static ToolStripItem[] BuildStrip(XmlNode root)
        {
            List<ToolStripItem> items = new List<ToolStripItem>();
            XmlNodeList nodeList = root.SelectNodes("item");

            //Change the price on the books.
            foreach (XmlNode node_item in nodeList)
                items.Add(BuildItem((XmlElement)node_item));

            return items.ToArray();
        }



        public static bool toBool(string str)
        {
            return !(String.IsNullOrEmpty(str) || str == "false" || str == "0");
        }

    }
    static class SocketExtensions
    {
        public static bool IsConnected(Socket socket)
        {
            try
            {
                return !(socket.Poll(1, SelectMode.SelectRead) && socket.Available == 0);
            }
            catch (SocketException) { return false; }
        }
    }
}
