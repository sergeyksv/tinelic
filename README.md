# Tinelic
Light weight application performance and error monitoring server for GetSentry (raven.js) and New Relic agents.

[![Build Status](https://travis-ci.org/sergeyksv/tinelic.svg?branch=master)](https://travis-ci.org/sergeyksv/tinelic)

Live system with demo account (log-in: demo, password: demo): http://tinelic.skilap.org/web

## Intro
We are developers. We see a lot of benefits from using of error reporting and app monitoring software. We tried to use
many tools and no one satisfy us. We tried to improove some of them but at the end we build our own. Everybody do the same ;)

## Concept
Tinelic is Node.JS application which works as backend for application and error reporting agents and as GUI. In order
to simplify things we didn't do any complex data processing and fully rely to MongoDB scalability. This gives us
flexibility and enough capacity for midle sized apps.

For data collection Tinelic uses following agents:

1. NewRelic APM agent (currently tested only Node.JS agent). Agent used as is and just report to Tinelic instead of
original server. Application performcance and error reporting is supported.
2. GetSentry (Raven.JS) agent for browser error reporting. Agent used as is and the same report to Tinelic.
3. GetSentry (Raven.NodeJS) agent for server side error reporting. Useful when you need only error reporting.
4. Tinelic code for end user browser side monitoring (Ajax & Page load)

## Launch

1. Install mongodb
Preferable (but nor requieed) version 3.0 and above

2. Get the code
Pull this repository code and submodules (git pull & git submodule init & git submodule update)

3. Install nodejs
NodeJS > 0.12 or IO.JS

4. Run server and access it on http://localhost/web
  ```
  node app
  ```
5. Use the app
You can login into system with default admin user (admin/tinelic). Tinelic monitor itself so you'll immedially see some data.

6. (optional) Add ssl certs and host name

7. (optional) Compile minified code and launch in production mode
  - Install grunt and build production code ```grunt build```
  - copy ```config.json``` to ```local-config.json``` and change ```env``` property to ```production```

## Agent configuration

Tinelic integrated all agents to monitor itself. So you can check its code for more details. Here is some brief details:

1. NewRelic
Add ```host:'some.server.com'``` property into ```newrelic.js``` configuration file. If your server has not https connection also add
```port:80``` and ```ssl:false``` properties. This will enable server side application performance and error reporting
and client side real user behavior monitoring if it was already inegrated using ```newrelic.getBrowserTimingHeader()```

2. GetSentry (serve side)
Init agent as follows:
  ```
  new raven.Client('http://blah:blah@some.server.com/collect/sentry/{project_id});
  ```
3. GetSentry & Tinelic RUM (client side)
Its possible to include and use only GetSentry error reporting or Tinelic RUM or both. Approperiate scripts should be
refferences. In the example below we use combined version
```
<script src="//some.server.com/js/build/tinelic.js></script>
<script>
	var _t_page = new Date();
	Tinelic.config({
		url:location.protocol + 'some.server.com',
		project:"some_project",
		route:"some_route",
		_dtp:_t_page,
	});
	Raven.config(location.protocol + '//nah@' + location.hostname + (location.port ? ':' + location.port : '')+'/collect/sentry/{_t_self_id}', {
		dataCallback: function(data) {
			data._dtp = _t_page;
			data._dt = new Date();
			return data;
		}
	}).install();
</script>
```

## MIT License

Copyright (c) [PushOk Software](http://www.pushok.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
