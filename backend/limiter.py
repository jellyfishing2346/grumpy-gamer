from slowapi import Limiter

try:
    from .ledger import client_ip
except ImportError:
    from ledger import client_ip

# Key by the real client IP (from X-Forwarded-For behind the hosting proxy).
# slowapi's default get_remote_address would see the proxy's address, putting
# every user in one shared bucket.
limiter = Limiter(key_func=client_ip)
