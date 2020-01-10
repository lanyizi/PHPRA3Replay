import SimpleHTTPServer
import SocketServer
import httplib

PORT = 8000

class MockServer(SimpleHTTPServer.SimpleHTTPRequestHandler):
    def _forwardToServer(self, method):
        conn = httplib.HTTPConnection('lanyi.altervista.org')
        if(method != 'POST'):
            conn.request(method, self.path)
        else:
            contentLength = self.headers.getheader('content-length')
            print('Post content length: %s' % str(contentLength))
            input = self.rfile.read(int(contentLength))
            conn.request(method, self.path, input)
        response = conn.getresponse()
        data = response.read()
        self.send_response(response.status, response.reason)
        self.send_header('Content-Length', len(data))
        self.end_headers()
        self.wfile.write(data)


    def do_GET(self):
        print('Path: %s' % self.path)

        q = self.path.find('?')
        if q == -1:
            q = len(self.path)
        if self.path[:q].endswith('.php'):
            self._forwardToServer('GET')
            return
        
        if self.path.startswith('/replays/'):
            self.path = self.path[len('/replays/'):]
            
        return SimpleHTTPServer.SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        print('Path: %s' % self.path)

        q = self.path.find('?')
        if q == -1:
            q = len(self.path)
        if self.path[:q].endswith('.php'):
            self._forwardToServer('POST')
            return
        
        if self.path.startswith('/replays/'):
            self.path = self.path[len('/replays/'):]
            
        return SimpleHTTPServer.SimpleHTTPRequestHandler.do_POST(self)
        

httpd = SocketServer.TCPServer(('', PORT), MockServer)

print('Serving at port %d' % PORT)
httpd.serve_forever()