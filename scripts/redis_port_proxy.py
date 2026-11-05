import socket
import threading

def forward(src, dst):
    try:
        while True:
            data = src.recv(4096)
            if not data:
                break
            dst.sendall(data)
    except Exception:
        pass
    finally:
        try:
            src.close()
        except Exception:
            pass
        try:
            dst.close()
        except Exception:
            pass

def main():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(('0.0.0.0', 6380))
    server.listen(100)
    print("Redis proxy listening on port 6380 (forwarding to 6379)...", flush=True)
    while True:
        client_sock, _ = server.accept()
        try:
            redis_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            redis_sock.connect(('127.0.0.1', 6379))
            t1 = threading.Thread(target=forward, args=(client_sock, redis_sock), daemon=True)
            t2 = threading.Thread(target=forward, args=(redis_sock, client_sock), daemon=True)
            t1.start()
            t2.start()
        except Exception as e:
            try:
                client_sock.close()
            except Exception:
                pass

if __name__ == '__main__':
    main()

