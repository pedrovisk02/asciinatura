# Servidor para testar o app no computador: python servidor.py
#
# Igual ao "python -m http.server", com duas diferenças:
# - só aceita conexões deste computador (127.0.0.1), não da rede Wi-Fi;
# - manda o navegador sempre buscar a versão mais nova dos arquivos. Sem isso,
#   um F5 pode continuar usando uma cópia antiga guardada, e a correção que
#   acabou de ser feita parece não ter funcionado.

import http.server
import os

PORTA = 8000


class SemCopiaGuardada(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


# Serve a pasta onde este arquivo está, de onde quer que o comando seja rodado.
os.chdir(os.path.dirname(os.path.abspath(__file__)))

print(f'App em http://localhost:{PORTA} (Ctrl+C para parar)')
http.server.ThreadingHTTPServer(('127.0.0.1', PORTA), SemCopiaGuardada).serve_forever()
