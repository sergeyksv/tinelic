FROM node:10.15.3

# Chrome & Xvfb
RUN \
	wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
	echo "deb http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list && \
	apt-get update && \
	apt-get install -y \
	google-chrome-stable \
	xvfb \
	&& rm -rf /var/lib/apt/lists/*

RUN \
	export DISPLAY=:99.0

# CMD ["/bin/bash"]

CMD \
	Xvfb -ac $DISPLAY &

# docker login git.pushok.com:4567
# docker build -t git.pushok.com:4567/pushok/tinelic/tinelic-test -f test.dockerfile .
# docker push git.pushok.com:4567/pushok/tinelic/tinelic-test
