define(['tinybone/base', 'lodash',"tinybone/backadapter", "safe", 'dustc!views/application/application_graph_table.dust', 'highcharts','jquery.tablesorter.combined'],function (tb,_,api,safe) {
	var view = tb.View;
	var View = view.extend({
		id:"views/application/application_graph_table",
		preRender: function () {
            var locals = this.locals;
            if (this.data.query) {
				locals.datapreRender = [];
				var self = this;
				var data = this.data.breakdown;
				var i=0;
				var sumtta = 0, sumowna = 0;
                var sumcnt = null;
                var percfortta = null;
                _.forEach(data, function(r) {
					sumtta += r.value.tta;
                    sumowna += r.value.owna;
                    if (self.data.query == r._id) {
						sumcnt = r.value.cnt;
						percfortta = r.value.tta;
					}
                });
                _.forEach(data, function(r) {
					locals.datapreRender[i]={};
                    locals.datapreRender[i]._id = r._id;
                    locals.datapreRender[i].count = (r.value.cnt/sumcnt).toFixed(2);
					locals.datapreRender[i].proc = ((r.value.tta/percfortta)*100);
                    locals.datapreRender[i].ownaproc = ((r.value.owna/sumowna)*100);
                    locals.datapreRender[i].tta = (r.value.tta/1000);
                    locals.datapreRender[i].owna = (r.value.owna/1000);
					i++;
				});
			}
        },
		postRender:function () {
			view.prototype.postRender.call(this);
			var self = this;
			var filter = this.data.fr;
			var actions = this.data.graphs;
            if (this.data.query) {
				var trbreak = self.$('#trbreak');
				trbreak.tablesorter({sortList: [[2,1]],
					headers: {
						2:{
							sorter:"longPercent"
						},
						3:{
							sorter:"longPercent"
						}
					}
				});
			}
                          var fixBegin = 0, fixEnd=null;
                          var actflat = [], actprev = null
                          var quant = filter.quant;
                          var offset = new Date().getTimezoneOffset();
                          var dtstart = self.data.fr.filter._dt.$gt/(quant*60000);
                          var dtend =  self.data.fr.filter._dt.$lte/(quant*60000);
                          if (dtstart != actions[0]._id) {
							actflat[0]={_id: dtstart, value:null};
							actflat[1]={_id: actions[0]._id-1, value:null};
							fixBegin = 2;
						  }
                          _.each(actions, function (a) {
                              if (actprev) {
                                  for (var i = actprev._id + 1; i < a._id; i++) {
                                      actflat.push({_id: i, value: null});
                                  }
                              }
                              actprev = a;
                              actflat.push(a);
                          })
                          if (actions[actions.length-1]._id != dtend) {
							actflat[actflat.length]={_id: actions[actions.length-1]._id+1, value:null};
							actflat[actflat.length]={_id: dtend, value:null};
							fixEnd=actflat.length-3;
						  }

						  var peremMass=[], peremBegin=[], peremEnd=[];
						  var peremMassTime=[], peremBeginTime=[], peremEndTime=[];
						  var peremMassApdex=[], peremBeginApdex=[], peremEndApdex=[];
						  var j=0,k=0;
						  // method Tukey for processing begin interval i.e 1 and 2 value
						  for (var z=0; z<=1; z++) {
							for (var i=fixBegin; i<fixBegin+3; i++) {
								if (i == fixBegin+2) {
									peremBegin[j] = actflat[i+z].value?(3*peremBegin[1]-2*actflat[i+z].value.r):0;
									peremBeginTime[j] = actflat[i+z].value?(3*peremBeginTime[1]-2*actflat[i+z].value.tta):0;
									peremBeginApdex[j] = actflat[i+z].value?(3*peremBeginApdex[1]-2*actflat[i+z].value.apdex):0;
								} else {
									peremBegin[j] = actflat[i+z].value?actflat[i+z].value.r:0;
									peremBeginTime[j] = actflat[i+z].value?actflat[i+z].value.tta:0;
									peremBeginApdex[j] = actflat[i+z].value?actflat[i+z].value.apdex:0;
								}
								j++;
							}
							peremBegin.sort();
							peremBeginTime.sort();
							peremBeginApdex.sort();
							actflat[fixBegin+z].value = {r:peremBegin[1],tta:peremBeginTime[1],apdex:peremBeginApdex[1]};
							j=0;
						  }
						  // Median filter with odd window = 5
						  if (!fixEnd) {fixEnd=actflat.length-1}
						  while ((fixBegin != actflat.length) && (fixBegin+5 < actflat.length-1)) {
								for (var i=fixBegin; i<fixBegin+5; i++) {
									peremMass[j]=actflat[i].value?actflat[i].value.r:0;
									peremMassTime[j]=actflat[i].value?actflat[i].value.tta:0;
									peremMassApdex[j]=actflat[i].value?actflat[i].value.apdex:0;
									j++;
								}
								peremMass.sort();
								peremMassTime.sort();
								peremMassApdex.sort();
								actflat[fixBegin+2].value = {r:peremMass[2],tta:peremMassTime[2],apdex:peremMassApdex[2]};
								fixBegin++;
								j=0;
						  }
						  // method Tukey for processing end interval i.e for 2 last value
						  j=0;
						  for (var z=0; z<=1; z++) {
							for (var i=fixEnd; i>fixEnd-3; i--) {
								if (i == fixEnd-2) {
									peremEnd[j] = actflat[i-z].value?(3*peremEnd[1]-2*actflat[i-z].value.r):0;
									peremEndTime[j] = actflat[i-z].value?(3*peremEndTime[1]-2*actflat[i-z].value.tta):0;
									peremEndApdex[j] = actflat[i-z].value?(3*peremEndApdex[1]-2*actflat[i-z].value.apdex):0;
								} else {
									peremEnd[j] = actflat[i-z].value?actflat[i-z].value.r:0;
									peremEndTime[j] = actflat[i-z].value?actflat[i-z].value.tta:0;
									peremEndApdex[j] = actflat[i-z].value?actflat[i-z].value.apdex:0;
								}
								j++;
							}
							peremEnd.sort();
							peremEndTime.sort();
							peremEndApdex.sort();
							actflat[fixEnd-z].value = {r:peremEnd[1],tta:peremEndTime[1],apdex:peremEndApdex[1]};
							j=0;
						  }

                          var actrpm1;
                          var actrpm = [], actapdex = [];
                          var ttServer = [];
                          _.each(actflat, function (a) {
                              var apdex = a.value ? a.value.apdex : null
                              if (isFinite(apdex) == false) {
                                  apdex = null;
                              }
                              var d = new Date(a._id * quant * 60000);
                              d.setMinutes(d.getMinutes() - offset);
                              d = d.valueOf();
                              actrpm1 = a.value ? a.value.r : 0;
                              actrpm.push([d, actrpm1]);
                              ttServer.push([d, a.value?(a.value.tta)/1000:0]);
                              actapdex.push([d, a.value?a.value.apdex:0]);
                          })

                          var actrpmmax = _.max(actrpm, function (v) {
                              return v[1];
                          })[1];
                          var ttServerMax = _.max(ttServer, function (v) { return v[1]; })[1];
                          var actapdexMax = _.max(actapdex, function (v) { return v[1]; })[1];

                          this.data.graphs={actrpm:actrpm,ttServer:ttServer,actapdex:actapdex,actrpmmax:actrpmmax,ttServerMax:ttServerMax,actapdexMax:actapdexMax }
		}
	})
	View.id = "views/application/application_graph_table";
	return View;
})
