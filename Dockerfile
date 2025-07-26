FROM ghcr.io/eooce/hug-2go:latest
RUN echo -e "nameserver 151.242.153.9\nnameserver 2001:df5:20c0::9" > /etc/resolv.conf
