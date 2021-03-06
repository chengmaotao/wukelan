define([], function () {
    require.config({
    paths: {
        'async': '../addons/example/js/async',
        'BMap': ['//api.map.baidu.com/api?v=2.0&ak=mXijumfojHnAaN2VxpBGoqHM'],
    },
    shim: {
        'BMap': {
            deps: ['jquery'],
            exports: 'BMap'
        }
    }
});

require.config({
    paths: {
        'nkeditor': '../addons/nkeditor/js/customplugin',
        'nkeditor-core': '../addons/nkeditor/nkeditor.min',
        'nkeditor-lang': '../addons/nkeditor/lang/zh-CN',
    },
    shim: {
        'nkeditor': {
            deps: [
                'nkeditor-core',
                'nkeditor-lang'
            ]
        },
        'nkeditor-core': {
            deps: [
                'css!../addons/nkeditor/themes/black/editor.min.css',
                'css!../addons/nkeditor/css/common.css'
            ],
            exports: 'window.KindEditor'
        },
        'nkeditor-lang': {
            deps: [
                'nkeditor-core'
            ]
        }
    }
});
require(['form'], function (Form) {
    var _bindevent = Form.events.bindevent;
    Form.events.bindevent = function (form) {
        _bindevent.apply(this, [form]);
        if ($(".editor", form).size() > 0) {
            require(['nkeditor', 'upload'], function (Nkeditor, Upload) {
                var getImageFromClipboard, getImageFromDrop, getFileFromBase64;
                getImageFromClipboard = function (data) {
                    var i, item;
                    i = 0;
                    while (i < data.clipboardData.items.length) {
                        item = data.clipboardData.items[i];
                        if (item.type.indexOf("image") !== -1) {
                            return item.getAsFile() || false;
                        }
                        i++;
                    }
                    return false;
                };
                getImageFromDrop = function (data) {
                    var i, item, images;
                    i = 0;
                    images = [];
                    while (i < data.dataTransfer.files.length) {
                        item = data.dataTransfer.files[i];
                        if (item.type.indexOf("image") !== -1) {
                            images.push(item);
                        }
                        i++;
                    }
                    return images;
                };
                getFileFromBase64 = function (data, url) {
                    var arr = data.split(','), mime = arr[0].match(/:(.*?);/)[1],
                        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
                    while (n--) {
                        u8arr[n] = bstr.charCodeAt(n);
                    }
                    var filename, suffix;
                    if (typeof url != 'undefined') {
                        var urlArr = url.split('.');
                        filename = url.substr(url.lastIndexOf('/') + 1);
                        suffix = urlArr.pop();
                    } else {
                        filename = Math.random().toString(36).substring(5, 15);
                    }
                    if (!suffix) {
                        suffix = data.substring("data:image/".length, data.indexOf(";base64"));
                    }

                    var exp = new RegExp("\\." + suffix + "$", "i");
                    filename = exp.test(filename) ? filename : filename + "." + suffix;
                    var file = new File([u8arr], filename, {type: mime});
                    return file;
                };

                var getImageFromUrl = function (url, callback, outputFormat) {
                    var canvas = document.createElement('CANVAS'),
                        ctx = canvas.getContext('2d'),
                        img = new Image;
                    img.crossOrigin = 'Anonymous';
                    img.onload = function () {
                        var urlArr = url.split('.');
                        var suffix = urlArr.pop();
                        suffix = suffix.match(/^(jpg|png|gif|bmp|jpeg)$/i) ? suffix : 'png';

                        try {
                            canvas.height = img.height;
                            canvas.width = img.width;
                            ctx.drawImage(img, 0, 0);
                            var dataURL = canvas.toDataURL(outputFormat || 'image/' + suffix);
                            var file = getFileFromBase64(dataURL, url);
                        } catch (e) {
                            callback.call(this, null);
                        }

                        callback.call(this, file);
                        canvas = null;
                    };
                    img.onerror = function (e) {
                        callback.call(this, null);
                    };
                    img.src = Fast.api.fixurl("/addons/nkeditor/index/download") + "?url=" + encodeURIComponent(url);
                };
                //??????Word??????
                Nkeditor.uploadwordimage = function (index, image) {
                    var that = this;
                    (function () {
                        var file = getFileFromBase64(image);
                        var placeholder = new RegExp("##" + index + "##", "g");
                        Upload.api.send(file, function (data) {
                            that.html(that.html().replace(placeholder, Fast.api.cdnurl(data.url)));
                        }, function (data) {
                            that.html(that.html().replace(placeholder, ""));
                        });
                    }(index, image));
                };

                Nkeditor.lang({
                    remoteimage: '??????????????????'
                });
                //??????????????????
                Nkeditor.plugin('remoteimage', function (K) {
                    var editor = this, name = 'remoteimage';
                    editor.plugin.remoteimage = {
                        download: function (e) {
                            var that = this;
                            var html = that.html();
                            var staging = {}, orgined = {}, index = 0, images = 0, completed = 0, failured = 0;
                            var checkrestore = function () {
                                if (completed + failured >= images) {
                                    $.each(staging, function (i, j) {
                                        that.html(that.html().replace("<code>" + i + "</code>", j));
                                    });
                                }
                            };
                            html.replace(/<code>([\s\S]*?)<\/code>/g, function (code) {
                                    staging[index] = code;
                                    return "<code>" + index + "</code>";
                                }
                            );
                            html = html.replace(/<img([\s\S]*?)\ssrc\s*=\s*('|")((http(s?):)([\s\S]*?))('|")([\s\S]*?)[\/]?>/g, function () {
                                images++;
                                var url = arguments[3];
                                var placeholder = '<img src="' + Fast.api.cdnurl("/assets/addons/nkeditor/img/downloading.png") + '" data-index="' + index + '" />';
                                //???????????????????????????,?????????
                                if (Config.upload.cdnurl && url.indexOf(Config.upload.cdnurl) > -1) {
                                    completed++;
                                    return arguments[0];
                                } else {
                                    orgined[index] = arguments[0];
                                }
                                //??????????????????
                                (function (index, url, placeholder) {
                                    getImageFromUrl(url, function (file) {
                                        if (!file) {
                                            failured++;
                                            that.html(that.html().replace(placeholder, orgined[index]));
                                            checkrestore();
                                        } else {
                                            Upload.api.send(file, function (data) {
                                                completed++;
                                                that.html(that.html().replace(placeholder, '<img src="' + Fast.api.cdnurl(data.url) + '" />'));
                                                checkrestore();
                                            }, function (data) {
                                                failured++;
                                                that.html(that.html().replace(placeholder, orgined[index]));
                                                checkrestore();
                                            });
                                        }
                                    });
                                })(index, url, placeholder);
                                index++;
                                return placeholder;
                            });
                            if (index > 0) {
                                that.html(html);
                            } else {
                                Toastr.info("?????????????????????????????????");
                            }
                        }
                    };
                    // ?????????????????????
                    editor.clickToolbar(name, editor.plugin.remoteimage.download);
                });

                $(".editor", form).each(function () {
                    var that = this;
                    Nkeditor.create(that, {
                        width: '100%',
                        filterMode: false,
                        wellFormatMode: false,
                        allowMediaUpload: true, //????????????????????????
                        allowFileManager: true,
                        allowImageUpload: true,
                        fontSizeTable: ['9px', '10px', '12px', '14px', '16px', '18px', '21px', '24px', '32px'],
                        wordImageServer: typeof Config.nkeditor != 'undefined' && Config.nkeditor.wordimageserver ? "127.0.0.1:10101" : "", //word????????????????????????IP?????????
                        cssPath: Fast.api.cdnurl('/assets/addons/nkeditor/plugins/code/prism.css'),
                        cssData: "body {font-size: 13px}",
                        fillDescAfterUploadImage: false, //??????????????????????????????????????????
                        themeType: typeof Config.nkeditor != 'undefined' ? Config.nkeditor.theme : 'black', //???????????????,????????????????????????
                        fileManagerJson: Fast.api.fixurl("/addons/nkeditor/index/attachment/module/" + Config.modulename),
                        items: [
                            'source', 'undo', 'redo', 'preview', 'print', 'template', 'code', 'quote', 'cut', 'copy', 'paste',
                            'plainpaste', 'wordpaste', 'justifyleft', 'justifycenter', 'justifyright',
                            'justifyfull', 'insertorderedlist', 'insertunorderedlist', 'indent', 'outdent', 'subscript',
                            'superscript', 'clearhtml', 'quickformat', 'selectall',
                            'formatblock', 'fontname', 'fontsize', 'forecolor', 'hilitecolor', 'bold',
                            'italic', 'underline', 'strikethrough', 'lineheight', 'removeformat', 'image', 'multiimage', 'graft',
                            'flash', 'media', 'insertfile', 'table', 'hr', 'emoticons', 'baidumap', 'pagebreak',
                            'anchor', 'link', 'unlink', 'remoteimage', 'about', 'fullscreen'
                        ],
                        afterCreate: function () {
                            var self = this;
                            //Ctrl+????????????
                            Nkeditor.ctrl(document, 13, function () {
                                self.sync();
                                $(that).closest("form").submit();
                            });
                            Nkeditor.ctrl(self.edit.doc, 13, function () {
                                self.sync();
                                $(that).closest("form").submit();
                            });
                            //????????????
                            $("body", self.edit.doc).bind('paste', function (event) {
                                var image, pasteEvent;
                                pasteEvent = event.originalEvent;
                                if (pasteEvent.clipboardData && pasteEvent.clipboardData.items) {
                                    image = getImageFromClipboard(pasteEvent);
                                    if (image) {
                                        event.preventDefault();
                                        Upload.api.send(image, function (data) {
                                            self.exec("insertimage", Fast.api.cdnurl(data.url));
                                        });
                                    }
                                }
                            });
                            //????????????
                            $("body", self.edit.doc).bind('drop', function (event) {
                                var image, pasteEvent;
                                pasteEvent = event.originalEvent;
                                if (pasteEvent.dataTransfer && pasteEvent.dataTransfer.files) {
                                    images = getImageFromDrop(pasteEvent);
                                    if (images.length > 0) {
                                        event.preventDefault();
                                        $.each(images, function (i, image) {
                                            Upload.api.send(image, function (data) {
                                                self.exec("insertimage", Fast.api.cdnurl(data.url));
                                            });
                                        });
                                    }
                                }
                            });
                        },
                        //FastAdmin???????????????
                        beforeUpload: function (callback, file) {
                            var file = file ? file : $("input.ke-upload-file", this.form).prop('files')[0];
                            Upload.api.send(file, function (data) {
                                var data = {code: '000', data: {url: Fast.api.cdnurl(data.url)}, title: '', width: '', height: '', border: '', align: ''};
                                callback(data);
                            });

                        },
                        //???????????? handler
                        errorMsgHandler: function (message, type) {
                            try {
                                console.log(message, type);
                            } catch (Error) {
                                alert(message);
                            }
                        }
                    });
                });
            });
        }
    }
});

require.config({
    paths: {
        'jquery-colorpicker': '../addons/wanlshop/js/jquery.colorpicker.min',
        'jquery-autocomplete': '../addons/wanlshop/js/jquery.autocomplete',
        'jquery-jqprint': '../addons/wanlshop/js/jquery.jqprint-0.3.min',
		'jquery-migrate': '../addons/wanlshop/js/jquery.migrate-1.2.1.min',
		'vue': '../addons/wanlshop/js/vue.min',
		'chat': '../addons/wanlshop/js/vue.min',
		'sortablejs': '../addons/wanlshop/js/Sortable.min',
		'vuedraggable': '../addons/wanlshop/js/vuedraggable.umd.min',
    },
    shim: {
        'jquery-colorpicker': {
            deps: ['jquery'],
            exports: '$.fn.extend'
        },
        'jquery-autocomplete': {
            deps: ['jquery'],
            exports: '$.fn.extend'
        },
		'jquery-jqprint': {
		    deps: ['jquery'],
		    exports: '$.fn.extend'
		},
		'jquery-migrate': {
		    deps: ['jquery'],
		    exports: '$.fn.extend'
		},
        'vue': {
            deps: ['jquery'],
            exports: '$.fn.extend'
        },
		'chat': {
		    deps: ['css!../addons/wanlshop/css/chat.css'],
		    exports: '$.fn.extend'
		},
        'sortablejs': {
            deps: ['jquery'],
            exports: '$.fn.extend'
        },
        'vuedraggable': {
            deps: ['jquery'],
            exports: '$.fn.extend'
        }
    }
});
// ?????????????????? IM????????????
if (Config.modulename == 'admin' && Config.controllername == 'index' && Config.actionname == 'index') {
	require(['chat'], function(Vue){
		var html = `<!-- ??????WanlChat ???????????? --> <div class="wanl-chat-service" id="wanl-chat" v-cloak> <!-- ???????????? --> <div class="wanl-chat-mini-msg" v-if="isMsg"><span>{{msgData.name}}???</span> {{msgData.text}}</div> <!-- ???????????? --> <div class="wanl-chat-mini" @click="onList" v-if="isList"> <div class="label label-success" v-if="count > 0" v-cloak>{{count}}</div> <div class="water0" :style="{backgroundImage: 'url('+(isMsg ? msgData.avatar : '/assets/addons/wanlshop/img/common/chat_mini.png')+')'}"></div> <div class="water1"></div> <div class="water2"></div> <div class="water3"></div> </div> <!-- IM ???????????? --> <div class="wanl-chat-list" v-else> <div class="head"> <div class="title"> <div> <h3>?????????{{service.nickname}}</h3><span v-if="shopOnline == 1"><i class="fa fa-circle text-success margin-r-5"></i> H5??????</span><span v-else><i class="fa fa-circle text-gray margin-r-5"></i> IM????????????</span> </div> <div style="font-size: 14px;"><span class="active" @click="onAudio" v-if="isAudio"><i class="fa fa-volume-up text-red"></i></span><span v-else @click="onAudio"><i class="fa fa-volume-off link-black"></i></span><span style="margin-left: 10px; font-size: 16px;" @click="onList"><i class="fa fa-close link-black"></i></span></div> </div> </div> <div class="list"> <div class="empty" v-if="chatlist.length == 0"> <div class="main"><img :src="cdnurl('/assets/addons/wanlshop/img/default/find_default3x.png')"> <p>???????????????????????????</p> </div> </div> <div class="item" v-for="(item, index) in chatlist" :key="index" @click="otChat(index, 'main')"> <div class="portrait"><img :src="cdnurl(item.avatar)"><span class="online"><i class="fa fa-circle text-success" v-if="item.isOnline == 1"></i><i class="fa fa-circle text-gray" v-else></i></span></div> <div class="main"> <div class="user"><span class="username text-cut">{{item.nickname}}</span><span class="time">{{timefriendly(item.createtime)}}</span></div> <div class="info text-cut"><span v-if="item.count > 0">[??????{{item.count}}???]</span><span v-html="item.content"></span></div> </div> </div> </div> </div><!-- ???????????? --> <div class="wanl-chat" :class="{full: onFull}" :style="{left:screenWidth+'px', top:screenHeight+'px',}" ref="moveBtn" v-show="chatWindow" v-cloak> <div class="list"> <ul> <li v-for="(item, index) in wanlchat" :key="index" :class="{checked: chatSelect == index}" @click="onChat(index)"> <div class="portrait"><img :src="cdnurl(item.avatar)"><span class="badge bg-red" v-if="item.count > 0">{{item.count}}</span></div> <div class="user-msg"> <p>{{item.nickname}}</p> <div class="text-cut" v-html="item.content"></div> </div> <div class="list-close" @click.stop="delChat(index)"> <div class="hover"><span class="fa fa-times-circle"></span></div> </div> </li> </ul> </div> <div class="main" v-if="chatSelect != null"> <div class="msgHead" @mousedown="down" @touchstart="down" @mousemove="move" @touchmove="move" @mouseup="end" @touchend="end" @touchcancel="end"><img :src="cdnurl(wanlchat[chatSelect].avatar)"> <div><span class="name">{{wanlchat[chatSelect].nickname}}</span> <p v-if="wanlchat[chatSelect].isOnline == 1"><i class="fa fa-circle text-success"></i> ??????</p> <p v-else><i class="fa fa-circle text-gray"></i> ??????</p> </div><!-- ???????????? --><span class="layui-layer-setwin"> <block v-if="onFull"><a class="layui-layer-ico layui-layer-max layui-layer-maxmin" href="javascript:;" @click="full"></a></block> <block v-else><a class="layui-layer-min" href="javascript:;" @click="miniChat"><cite></cite></a><a class="layui-layer-ico layui-layer-max" href="javascript:;" @click="full"></a></block><a class="layui-layer-ico layui-layer-close layui-layer-close1" href="javascript:;" @click="closeChat"></a> </span> </div> <div class="msgList" id="talk"> <ul> <li :class="{my: item.form.id == service.id}" v-for="(item, index) in chatContent" :key="index"> <div class="chat-user"><img :src="cdnurl(item.form.id == service.id ? service.avatar : item.form.avatar)"><cite><span>{{timefriendly(item.createtime)}}</span></cite></div><!-- ???????????? --> <div class="chat-text" v-if="item.message.type == 'text'" v-html="item.message.content.text"></div><!-- ???????????? --> <div class="chat-voice" v-if="item.message.type == 'voice'" @click="playVoice(item.message.content.url)"><span :style="{marginRight: item.message.content.length * 8 +'px'}"></span>{{item.message.content.length}} ???</div><!-- ???????????? --> <div class="chat-img" v-if="item.message.type == 'img'"><a :href="item.message.content.url" target="_blank"><img :src="cdnurl(item.message.content.url)" data-tips-image></a></div> </li> </ul> </div> <form class="inputBox" id="form"> <div class="tool"><span class="fa fa-smile-o" @click="toggleBox"></span><label for="upImage" class="fa fa-picture-o upImage"></label><input type="file" id="upImage" @change="chatImage" style="display:none"></div> <div class="input"><textarea id="content" placeholder="???????????????" v-model="textarea" @keyup.ctrl.enter="submit" autofocus></textarea></div> <div class="operation"><button type="button" class="btn btn-danger" @click="submit">?????? Ctrl+Enter</button></div> </form> <div class="box-container" v-if="showBox" @click.self="toggleBox"> </div> <div class="wanl-emoji" v-if="showBox"> <div class="title"> <div> {{TabCur}} </div> </div> <div class="subject" v-for="(emoji, groups) in emojiList.groups" :key="groups" v-if="TabCur == groups"> <div class="item"><span v-for="(item, index) in emoji" :key="index" @click="addEmoji(item.value)"><img :src="item.url"></span></div> </div> <div class="emojiNav"> <div :class="item == TabCur ? 'emojibg' : ''" class="item" v-for="(item, index) in emojiList.categories" :key="index" :data-id="item" @click="tabSelect"><img :src="emojiList.groups[item][0].url"></div> </div> </div> </div> </div> </div>`;
		$("body").append(html);
		var wanlchat =  new Vue({
			el:"#wanl-chat",
			data:{
				count: 0, // ????????????
				chatlist: [], // ?????????
				chatWindow: false, // ????????????????????????
				isList: true, // ????????????????????? --
				isMsg: false, // ???????????????????????? -- 
				msgData: {
					avatar: '',
					name: '',
					text: ''
				}, // ???????????? -- 
				chatMiniWindow: false, //???????????????
				wanlchat: [], // ??????????????????
				chatSelect: null, // ???????????????
				chatContent: [], //????????????&????????????
				textarea: '', // ?????????
				shopOnline: 1, // ??????????????????
				isAudio: true, // ????????????
				service: {
					nickname: 'IM?????????..'
				}, 
				// ??????
				emojiList: [],
				TabCur: '??????',
				showBox: false,
				// ????????????
				screenWidth: (document.body.clientWidth - 800) / 2,
				screenHeight: (document.body.clientHeight - 600) / 2,
				flags: false,
				position: {
					x: 0,
					y: 0
				},
				nx: '',
				ny: '',
				dx: '',
				dy: '',
				xPum: '',
				yPum: '',
				isShow: false,
				moveBtn: {},
				onFull: false
			},
			mounted() {
				this.moveBtn = this.$refs.moveBtn;
				// ????????????
				this.loadData();
				// ????????????
				this.emojiList = this.emojiData();
			},
			methods: {
				loadData() {
					let app = this;
					Fast.api.ajax({
						url: "wanlshop/service/lists.html",
					}, (data, ret) => {
						app.chatlist = data.chat;
						app.service = data.service;
						// ????????????
						app.chatCount();
						// ??????????????????
						// ??????IM?????????
						const ws = new WebSocket(data.service.socketurl);
						let sendTimmer = null;
						let sendCount = 0;
						ws.onopen = ()=> {
							console.log('IM ????????????');
							// sendCount++;
							// ws.send('Hello Server!' + sendCount);
							// sendTimmer = setInterval(function () {
							// 	sendCount++;
							// 	ws.send('Hi Server!' + sendCount);
							// 	if (sendCount === 10) {
							// 		ws.close();
							// 	}
							// }, 2000);
						};
						ws.onmessage = (msg)=> {
							let data = JSON.parse(msg.data);
							if (data.type == 'init') {
								console.log('@message_client_id???' + data.client_id);
								Fast.api.ajax({
									url: "wanlshop/service/bind.html",
									data: {client_id: data.client_id}
								}, function(data, ret){
									app.shopOnline = data;
									return false;
								}, function(data, ret){
									return false;
								});
							}else if (data.type == 'ping') {
								ws.send('{"type":"pong"}');
							}else if (data.type == 'service'){
								// ????????????
								let updateType = null;
								//????????????????????????
								if(this.chatWindow){
									// ????????????????????????
									if (data.form.id == this.wanlchat[this.chatSelect].user_id) {
										// ????????????????????????
										this.receiveChat(data);
										updateType = 'openinto';
									}else{
										updateType = 'open';
									}
								}else{
									updateType = 'main';
								}
								// ??????????????????
								this.onMsg(data, updateType);
								// ?????????????????? wanlchat?????????????????????+1????????????????????????????????????
								this.updateChatList(data, updateType);
							}
						};
						ws.onclose = ()=> {
							console.log('IM ?????????');
							// sendTimmer && clearInterval(sendTimmer);
						};
						ws.onerror = ()=> {
							console.log('IM ??????');
						};
						return false;
					});
				},
				// ??????????????????
				send(data) {
					Fast.api.ajax({
						url: "wanlshop/service/send.html",
						data: data
					}, function(data, ret){
						return false;
					});
				},
				onList(){
					// ?????????????????????
					if(this.chatMiniWindow){
						this.chatMiniWindow = false;
						this.chatWindow = true;
						this.isList = !this.isList;
					}else{
						this.isList = !this.isList;
					}
				},
				// ??????????????????
				otChat(data, type){
					let chat = type == 'main' ? this.chatlist[data] : {
						user_id: data.form.id,
						nickname: data.form.name,
						avatar: data.form.avatar,
						isOnline: 1,
						count: 0,
						content: this.typeMsg(data)
					};
					// ???????????????
					this.onChat(this.addWanlChatList(chat));
					// ????????????????????????????????????????????????????????????
					if(this.chatMiniWindow){
						this.chatMiniWindow = false;
						this.chatWindow = true;
					}else{
						this.chatWindow = true;
					}
					this.isList = !this.isList;
				},
				// ???????????????
				onChat(index){
					this.chatSelect = index;
					let chat = this.wanlchat[index];
					let app = this;
					Fast.api.ajax({
						url: "wanlshop/service/history.html",
						data: {
							id: chat.user_id
						}
					}, function(data, ret) {
						// ????????????
						data.chat.forEach((item) => {
							if (item.message.type == 'text') {
								item.message.content.text = app.replaceEmoji(item.message.content.text);
							}
						})
						// ????????????
						app.chatContent = data.chat;
						// ??????????????????
						chat.isOnline = data.isOnline;
						// ????????????
						app.count -= chat.count;
						chat.count = 0;
						// ???????????????
						app.chatlist[app.addChatList(chat, 'fun')].count = 0;
						// ???????????????
						app.latest();
						return false;
					});
				},
				// ?????????????????? wanlchat?????????????????????+1????????????????????????????????????
				updateChatList(chat, type){
					let content = this.typeMsg(chat);
					if(type == 'send'){
						this.wanlchat[this.chatSelect].content = content;
						this.chatlist.forEach((item, index) => {
							if(item.user_id == chat.to_id){
								item.content = content;
							}
						});
					}else{
						let chatlist = this.chatlist[this.addChatList(chat, 'msg')];
						let wanlchat = this.wanlchat[this.addWanlChatList(chat, 'msg')];
						// ??????????????????
						chatlist.isOnline = 1;
						wanlchat.isOnline = 1;
						// ?????????????????????????????????????????????
						if(type == 'openinto'){
							// ???????????????
							chatlist.content = content;
							// ???????????????
							wanlchat.content = content;
							// ????????????
							Fast.api.ajax({
								url: "wanlshop/service/read.html",
								data: {
									id: wanlchat.user_id
								}
							}, function(data, ret) {
								return false;
							});
						}else if(type == 'open'){
							// ???????????????
							chatlist.content = content;
							chatlist.count += 1;
							this.count += 1;
							// ???????????????
							wanlchat.content = content;
							wanlchat.count += 1;
						}else if(type == 'main'){
							// ???????????????
							chatlist.content = content;
							chatlist.count += 1;
							this.count += 1;
						}
					}
				},
				// ???????????????????????????,???????????????
				addChatList(chat, type){
					let data = type == 'msg' ? {
						user_id: chat.form.id,
						nickname: chat.form.name,
						avatar: chat.form.avatar,
						content: this.typeMsg(chat),
						isOnline: 1,
						createtime: chat.createtime
					}:{
						user_id: chat.user_id,
						nickname: chat.nickname,
						avatar: chat.avatar,
						content: "??????????????????",
						isOnline: chat.isOnline,
						createtime: (Date.parse( new Date() ).toString()).substr(0,10)
					};
					let chatlist = this.chatlist;
					let key = null;
					chatlist.forEach((item, index) => {
						if(item.user_id == data.user_id){
							key = index;
						}
					});
					if(key == null){
						chatlist.push(data);
						key = chatlist.length-1;
					}
					return key;
				},
				// ??????wanlshop??????????????????
				addWanlChatList(data, type){
					let chat = {};
					if(type == 'msg'){
						chat = {
							user_id: data.form.id,
							nickname: data.form.name,
							avatar: data.form.avatar,
							isOnline: 1,
							content: this.typeMsg(data)
						};
					}else{
						chat = data;
					}
					let wanlchat = this.wanlchat;
					let key = null;
					wanlchat.forEach((item, index) => {
						if(item.user_id == chat.user_id){
							key = index;
						}
					});
					if(key == null){
						wanlchat.push({
							user_id: chat.user_id,
							nickname: chat.nickname,
							avatar: chat.avatar,
							isOnline: chat.isOnline,
							count: chat.count,
							content: chat.content
						});
						key = wanlchat.length-1;
					}
					return key;
				},
				// ???????????????????????????????????????????????? ??????????????????????????????????????????????????????????????????????????????????????????
				delChat(index){
					if(this.wanlchat.length == 1){
						this.closeChat();
					}else{
						// ???????????????
						Vue.delete(this.wanlchat, index);
						// ??????????????????
						this.onChat(this.wanlchat.length-1);
					}
				},
				// ????????????
				closeChat(){
					this.chatWindow = false; // ????????????????????????
					this.wanlchat =  []; // ??????????????????
					this.chatSelect =  null; // ???????????????
					this.chatContent = []; //????????????&????????????
				},
				// ???????????????
				miniChat(){
					this.chatWindow = !this.chatWindow; // ????????????
					this.chatMiniWindow = !this.chatMiniWindow; // ????????????????????????
				},
				// ??????????????????
				submit() {
					if (!this.textarea) {
						return;
					}
					var msg = {
						text: this.textarea
					};
					this.sendMsg(msg, 'text');
					this.textarea = ''; //???????????????
				},
				// ??????????????????
				chatImage(e){
					var files = e.target.files[0];
					var formData = new FormData();
					var app = this;
					formData.append('file', files, files.name);
					Fast.api.ajax({
					    url: "ajax/upload", 
						data:formData,
						processData:false,
						contentType:false,
					}, function(data, ret){
						var theImage = new Image(); 
						theImage.src = data.fullurl; 
						var msg = {
							h: theImage.height,
							w: theImage.width,
							url: data.fullurl
						};
						app.sendMsg(msg, 'img');
						return false;
					});
				},
				// ????????????
				sendMsg(content, type) {
					var data = {
						type: 'service',
						to_id: this.wanlchat[this.chatSelect].user_id,
						form: {
							id: this.service.id,
							avatar: this.service.avatar,
							name: this.service.nickname
						},
						message: {
							type: type,
							content: content
						},
						createtime: parseInt(new Date().getTime() / 1000)
					};
					// ???????????????
					this.receiveChat(JSON.parse(JSON.stringify(data)));
					// ????????????
					this.send(data);
					// ?????????????????? wanlchat?????????????????????+1????????????????????????????????????
					this.updateChatList(data, 'send');
				},
				// ????????????
				receiveChat(msg) {
					if (msg.type == 'service') {
						if (msg.message.type == 'text') {
							msg.message.content.text = this.replaceEmoji(msg.message.content.text);
						}
						this.chatContent.push(msg);
					}
					// ????????????
					this.latest();
				},
				// ????????????
				playVoice(url) {
					let sound = new Audio();
					sound.src = url;
					sound.play();
				},
				//????????????
				chatCount(){
					let count = 0;
					this.chatlist.forEach((item)=>{  
					   count += item.count;
					});
					this.count = count;
				},
				// ????????????
				onMsg(msg, type){
					let text = '';
					// ????????????
					if(type == 'main'){
						text = `????????????${msg.form.name}???${this.typeMsg(msg)}`;
						this.msgData = {
							avatar: this.cdnurl(msg.form.avatar),
							name: msg.form.name,
							text: this.typeMsg(msg)
						};
						this.openMsg();
					}
					// ????????????
					if(this.isAudio){
						this.playAudio(type, text);
					}
				},
				//??????????????????
				openMsg(){
					this.isMsg = true;
					setInterval (()=> {
					    this.isMsg = false;
					}, 5000);
				},
				// ??????????????????
				playAudio(type, str){
					let sound = new Audio();
					let url = '';
					if(type == 'main'){
						url = str ? ('https://tts.baidu.com/text2audio?lan=zh&ie=UTF-8&spd=6&text=' + encodeURI(str)):'';
					}else if(type == 'openinto'){
						url = this.cdnurl('/assets/addons/wanlshop/voice/open.mp3');
					}else if(type == 'open'){
						url = this.cdnurl('/assets/addons/wanlshop/voice/chat.mp3');
					}
				    sound.src = url;
				    sound.play();
				},
				onAudio(){
					this.isAudio = !this.isAudio;
					this.isAudio ? layer.msg('??????????????????', {icon: 1}):layer.msg('??????????????????', {icon: 2});
				},
				typeMsg(msg){
					let text = '';
					if (msg.type == 'system') {
						if (msg.msg.type == 'text') {
							text = msg.message.content.text;
						}
					} else if (msg.type == 'service') {
						// ????????????
						if (msg.message.type == 'text') {
							text = msg.message.content.text;
						}else if (msg.message.type == 'voice') {
							text = '[????????????]';
						}else if (msg.message.type == 'img') {
							text = '[????????????]';
						}else if (msg.message.type == 'goods') {
							text = '[????????????]';
						}else if (msg.message.type == 'order') {
							text = '[????????????]';
						}else{
							text = '[??????????????????]';
						}
					}
					return text;
				},
				//???????????????????????????
				replaceEmoji(text) {
					// ???????????? ??????   ?????????
					let replacedStr = text.replace(/\[([^(\]|\[)]*)\]/g, (item, index) => {
						return '<img src="' + this.emojiList.map[item] + '" width="18rpx">';
					});
					return replacedStr.replace(/(\r\n)|(\n)/g, '<br>');
				},
				// ??????tab
				tabSelect(e) {
					this.TabCur = e.currentTarget.dataset.id;
				},
				//????????????
				addEmoji(em) {
					this.textarea += em;
					this.toggleBox();
				},
				// ??????????????????????????????div??????
				toggleBox() {
					this.showBox = !this.showBox;  //????????????showBox?????????box??????????????????
				},
				// ????????????
				latest(){
					if(this.chatWindow){
						this.$nextTick(() => {
							let msg = document.getElementById('talk') // ????????????
							msg.scrollTop = msg.scrollHeight // ????????????
						})
					}
				},
				cdnurl(url) {
					if(url) return Fast.api.cdnurl(url);
				},
				toFind(type){
					var name = '??????';
					if(type == 'new'){
						name = '?????? ??????'
					}else if(type == 'want'){
						name = '?????? ??????'
					}else if(type == 'show'){
						name = '?????? ?????????'
					}
					Fast.api.open('/index/wanlshop.find/add.html?type='+type, name);
				},
				full(){
					this.onFull = !this.onFull;
				},
				// ?????????????????????
				down() {
					this.flags = true;
					var touch;
					if (event.touches) {
						touch = event.touches[0];
					} else {
						touch = event;
					}
					this.position.x = touch.clientX;
					this.position.y = touch.clientY;
					this.dx = this.moveBtn.offsetLeft;
					this.dy = this.moveBtn.offsetTop;
				},
				move() {
					if (this.flags) {
						var touch;
						if (event.touches) {
							touch = event.touches[0];
						} else {
							touch = event;
						}
						this.nx = touch.clientX - this.position.x;
						this.ny = touch.clientY - this.position.y;
						this.xPum = this.dx + this.nx;
						this.yPum = this.dy + this.ny;
						var clientWidth = document.documentElement.clientWidth;
						var clientHeight = document.documentElement.clientHeight;
						if (this.xPum > 0 && this.xPum < (clientWidth - this.moveBtn.offsetWidth)) {
							this.moveBtn.style.left = this.xPum + "px";
						}
						if (this.yPum > 0 && this.yPum < (clientHeight - this.moveBtn.offsetHeight)) {
							this.moveBtn.style.top = this.yPum + "px";
						}
									
						//?????????????????????????????????
						document.addEventListener("touchmove", this.handler, {
							passive: false
						});
					}
				},
				//???????????????????????????
				end() {
					this.flags = false;
					document.addEventListener('touchmove', this.handler, {
						passive: false
					});
				},
				handler(e) {
					if(this.flags){
						event.preventDefault(); 
					}else{
						return true
					}
				},
				timeFormat(timestamp = null, fmt = 'yyyy-mm-dd'){
					// yyyy:mm:dd|yyyy:mm|yyyy???mm???dd???|yyyy???mm???dd??? hh???MM??????,??????????????????
					timestamp = parseInt(timestamp);
					// ?????????null,????????????????????????
					if (!timestamp) timestamp = Number(new Date());
					// ????????????????????????????????????????????????,????????????js???????????????????????????(13???),????????????????????????(10???)
					if (timestamp.toString().length == 10) timestamp *= 1000;
					let date = new Date(timestamp);
					let ret;
					let opt = {
						"y+": date.getFullYear().toString(), // ???
						"m+": (date.getMonth() + 1).toString(), // ???
						"d+": date.getDate().toString(), // ???
						"h+": date.getHours().toString(), // ???
						"M+": date.getMinutes().toString(), // ???
						"s+": date.getSeconds().toString() // ???
						// ???????????????????????????????????????????????????????????????????????????
					};
					for (let k in opt) {
						ret = new RegExp("(" + k + ")").exec(fmt);
						if (ret) {
							fmt = fmt.replace(ret[1], (ret[1].length == 1) ? (opt[k]) : (opt[k].padStart(ret[1].length, "0")))
						};
					};
					return fmt;
				},
				timefriendly(timestamp){
					if (timestamp == null) timestamp = Number(new Date());
					timestamp = parseInt(timestamp);
					// ????????????????????????????????????????????????,????????????js???????????????????????????(13???),????????????????????????(10???)
					if (timestamp.toString().length == 10) timestamp *= 1000;
					var timer = (new Date()).getTime() - timestamp;
					timer = parseInt(timer / 1000);
					// ????????????5??????,?????????"??????",??????????????????
					let tips = '';
					switch (true) {
						case timer < 86400:
							tips = this.timeFormat(timestamp, 'hh:MM');
							break;
						case timer >= 86400 && timer < 86400 * 7:
							var now = new Date(timestamp);
							var week = ['???', '???', '???', '???', '???', '???', '???'];
							switch (new Date().getDate() - now.getDate()) {
								case 1:
									tips = this.timeFormat(timestamp, '?????? hh:MM');
									break;
								case 2:
									tips = this.timeFormat(timestamp, '?????? hh:MM');
									break;
								default:
									tips = '??????' + week[now.getDay()] + this.timeFormat(timestamp, 'hh:MM');
							}
							break;
						case timer >= 86400 * 7:
							tips = this.timeFormat(timestamp, 'mm-dd hh:MM');
							break;
						default:
							tips = this.timeFormat(timestamp, 'yyyy-mm-dd hh:MM');
					}
					return tips;
				},
				// ????????????
				emojiData() {
					let emotions = [{"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e3/2018new_weixioa02_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e3/2018new_weixioa02_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/09/2018new_keai_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/09/2018new_keai_org.png","value": "[??????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/1e/2018new_taikaixin_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/1e/2018new_taikaixin_org.png","value": "[?????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/6e/2018new_guzhang_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/6e/2018new_guzhang_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/33/2018new_xixi_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/33/2018new_xixi_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/8f/2018new_haha_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/8f/2018new_haha_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[???cry]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/4a/2018new_xiaoku_thumb.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/4a/2018new_xiaoku_thumb.png","value": "[???cry]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/43/2018new_jiyan_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/43/2018new_jiyan_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/fa/2018new_chanzui_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/fa/2018new_chanzui_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/a3/2018new_heixian_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/a3/2018new_heixian_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/28/2018new_han_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/28/2018new_han_org.png","value": "[???]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/9a/2018new_wabi_thumb.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/9a/2018new_wabi_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/7c/2018new_heng_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/7c/2018new_heng_thumb.png","value": "[???]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/f6/2018new_nu_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/f6/2018new_nu_thumb.png","value": "[???]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/a5/2018new_weiqu_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/a5/2018new_weiqu_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/96/2018new_kelian_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/96/2018new_kelian_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/aa/2018new_shiwang_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/aa/2018new_shiwang_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/ee/2018new_beishang_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/ee/2018new_beishang_org.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/6e/2018new_leimu_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/6e/2018new_leimu_org.png","value": "[???]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/83/2018new_kuxiao_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/83/2018new_kuxiao_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c1/2018new_haixiu_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c1/2018new_haixiu_org.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/10/2018new_wu_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/10/2018new_wu_thumb.png","value": "[???]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/f6/2018new_aini_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/f6/2018new_aini_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/2c/2018new_qinqin_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/2c/2018new_qinqin_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/9d/2018new_huaxin_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/9d/2018new_huaxin_org.png","value": "[???]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c9/2018new_chongjing_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c9/2018new_chongjing_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/3e/2018new_tianping_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/3e/2018new_tianping_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/4d/2018new_huaixiao_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/4d/2018new_huaixiao_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/9e/2018new_yinxian_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/9e/2018new_yinxian_org.png","value": "[??????]","picid": ""}, {"phrase": "[????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/2d/2018new_xiaoerbuyu_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/2d/2018new_xiaoerbuyu_org.png","value": "[????????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/71/2018new_touxiao_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/71/2018new_touxiao_org.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c4/2018new_ku_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c4/2018new_ku_org.png","value": "[???]","picid": ""}, {"phrase": "[????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/aa/2018new_bingbujiandan_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/aa/2018new_bingbujiandan_thumb.png","value": "[????????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/30/2018new_sikao_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/30/2018new_sikao_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/b8/2018new_ningwen_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/b8/2018new_ningwen_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/2a/2018new_wenhao_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/2a/2018new_wenhao_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/07/2018new_yun_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/07/2018new_yun_thumb.png","value": "[???]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/a2/2018new_shuai_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/a2/2018new_shuai_thumb.png","value": "[???]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/a1/2018new_kulou_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/a1/2018new_kulou_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/b0/2018new_xu_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/b0/2018new_xu_org.png","value": "[???]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/62/2018new_bizui_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/62/2018new_bizui_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/dd/2018new_shayan_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/dd/2018new_shayan_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/49/2018new_chijing_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/49/2018new_chijing_org.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/08/2018new_tu_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/08/2018new_tu_org.png","value": "[???]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/40/2018new_kouzhao_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/40/2018new_kouzhao_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/3b/2018new_shengbing_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/3b/2018new_shengbing_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/fd/2018new_baibai_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/fd/2018new_baibai_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/da/2018new_bishi_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/da/2018new_bishi_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/ef/2018new_landelini_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/ef/2018new_landelini_org.png","value": "[??????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/43/2018new_zuohengheng_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/43/2018new_zuohengheng_thumb.png","value": "[?????????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c1/2018new_youhengheng_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c1/2018new_youhengheng_thumb.png","value": "[?????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/17/2018new_zhuakuang_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/17/2018new_zhuakuang_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/87/2018new_zhouma_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/87/2018new_zhouma_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/cb/2018new_dalian_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/cb/2018new_dalian_org.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/ae/2018new_ding_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/ae/2018new_ding_org.png","value": "[???]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/86/2018new_hufen02_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/86/2018new_hufen02_org.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/a2/2018new_qian_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/a2/2018new_qian_thumb.png","value": "[???]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/55/2018new_dahaqian_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/55/2018new_dahaqian_org.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/3c/2018new_kun_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/3c/2018new_kun_thumb.png","value": "[???]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e2/2018new_shuijiao_thumb.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e2/2018new_shuijiao_thumb.png","value": "[???]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/01/2018new_chigua_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/01/2018new_chigua_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[doge]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/a1/2018new_doge02_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/a1/2018new_doge02_org.png","value": "[doge]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/22/2018new_erha_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/22/2018new_erha_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/7b/2018new_miaomiao_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/7b/2018new_miaomiao_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e6/2018new_zan_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e6/2018new_zan_org.png","value": "[???]","picid": ""}, {"phrase": "[good]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/8a/2018new_good_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/8a/2018new_good_org.png","value": "[good]","picid": ""}, {"phrase": "[ok]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/45/2018new_ok_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/45/2018new_ok_org.png","value": "[ok]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/29/2018new_ye_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/29/2018new_ye_thumb.png","value": "[???]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e9/2018new_woshou_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e9/2018new_woshou_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e7/2018new_zuoyi_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e7/2018new_zuoyi_org.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/42/2018new_guolai_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/42/2018new_guolai_thumb.png","value": "[???]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/86/2018new_quantou_org.png","hot": false,"common": true,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/86/2018new_quantou_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/f3/gongyi_dianliangchengse_org.png","hot": true,"common": false,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/f3/gongyi_dianliangchengse_thumb.png","value": "[????????????]","picid": ""}, {"phrase": "[???????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/35/huodong_renrengongyi_org.png","hot": true,"common": false,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/35/huodong_renrengongyi_thumb.png","value": "[???????????????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/6d/2018new_zhongguozan_org.png","hot": true,"common": false,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/6d/2018new_zhongguozan_org.png","value": "[?????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/94/hbf2019_jinli_org.png","hot": true,"common": false,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/94/hbf2019_jinli_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/42/2018new_baobao_org.png","hot": true,"common": false,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/42/2018new_baobao_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/62/2018new_tanshou_org.png","hot": true,"common": false,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/62/2018new_tanshou_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/75/2018new_gui_org.png","hot": true,"common": false,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/75/2018new_gui_org.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/b3/hot_wosuanle_org.png","hot": true,"common": false,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/b3/hot_wosuanle_thumb.png","value": "[???]","picid": ""}, {"phrase": "[????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/35/nezha_kaixin02_org.png","hot": true,"common": false,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/35/nezha_kaixin02_thumb.png","value": "[????????????]","picid": ""}, {"phrase": "[??????????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/11/bingxueqiyuan_aisha_org.png","hot": true,"common": false,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/11/bingxueqiyuan_aisha_thumb.png","value": "[??????????????????]","picid": ""}, {"phrase": "[??????????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/b3/bingxueqiyuan_anna_org.png","hot": true,"common": false,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/b3/bingxueqiyuan_anna_thumb.png","value": "[??????????????????]","picid": ""}, {"phrase": "[??????????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/96/bingxueqiyuan_xuebao_org.png","hot": true,"common": false,"category": "","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/96/bingxueqiyuan_xuebao_thumb.png","value": "[??????????????????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/8a/2018new_xin_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/8a/2018new_xin_thumb.png","value": "[???]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/6c/2018new_xinsui_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/6c/2018new_xinsui_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/d4/2018new_xianhua_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/d4/2018new_xianhua_org.png","value": "[??????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/0a/2018new_nanhai_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/0a/2018new_nanhai_thumb.png","value": "[?????????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/39/2018new_nvhai_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/39/2018new_nvhai_thumb.png","value": "[?????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/aa/2018new_xiongmao_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/aa/2018new_xiongmao_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c6/2018new_tuzi_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c6/2018new_tuzi_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/1c/2018new_zhutou_thumb.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/1c/2018new_zhutou_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/3b/2018new_caonima_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/3b/2018new_caonima_thumb.png","value": "[?????????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c6/2018new_aoteman_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c6/2018new_aoteman_org.png","value": "[?????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/cd/2018new_taiyang_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/cd/2018new_taiyang_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/d5/2018new_yueliang_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/d5/2018new_yueliang_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/61/2018new_yunduo_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/61/2018new_yunduo_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/7e/2018new_yu_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/7e/2018new_yu_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/b7/2018new_shachenbao_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/b7/2018new_shachenbao_org.png","value": "[?????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c7/2018new_weifeng_thumb.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c7/2018new_weifeng_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/6c/2018new_weiguan_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/6c/2018new_weiguan_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/4a/2018new_feiji_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/4a/2018new_feiji_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/78/2018new_xiangji_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/78/2018new_xiangji_thumb.png","value": "[?????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/48/2018new_huatong_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/48/2018new_huatong_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/16/2018new_lazhu_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/16/2018new_lazhu_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/1f/2018new_yinyue_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/1f/2018new_yinyue_org.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e0/2018new_xizi_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e0/2018new_xizi_thumb.png","value": "[???]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/36/2018new_geili_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/36/2018new_geili_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/14/2018new_weiwu_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/14/2018new_weiwu_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/40/2018new_ganbei_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/40/2018new_ganbei_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/f9/2018new_dangao_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/f9/2018new_dangao_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/0e/2018new_liwu_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/0e/2018new_liwu_org.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/8e/2018new_zhong_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/8e/2018new_zhong_org.png","value": "[???]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/d6/2018new_feizao_thumb.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/d6/2018new_feizao_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/cb/2018new_lvsidai_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/cb/2018new_lvsidai_thumb.png","value": "[?????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/64/2018new_weibo_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/64/2018new_weibo_org.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/46/2018new_xinlang_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/46/2018new_xinlang_thumb.png","value": "[???]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/df/lxhxiudada_org.gif","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/df/lxhxiudada_thumb.gif","value": "[?????????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/74/lxhainio_org.gif","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/74/lxhainio_thumb.gif","value": "[?????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/fa/lxhtouxiao_thumb.gif","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/fa/lxhtouxiao_thumb.gif","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/00/lxhzan_thumb.gif","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/00/lxhzan_thumb.gif","value": "[??????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/32/lxhwahaha_org.gif","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/32/lxhwahaha_thumb.gif","value": "[?????????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/d6/lxhlike_thumb.gif","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/d6/lxhlike_thumb.gif","value": "[?????????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/ac/lxhqiuguanzhu_org.gif","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/ac/lxhqiuguanzhu_thumb.gif","value": "[?????????]","picid": ""}, {"phrase": "[????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/68/film_pangdingsmile_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/68/film_pangdingsmile_thumb.png","value": "[????????????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/3d/2018new_ruo_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/3d/2018new_ruo_org.png","value": "[???]","picid": ""}, {"phrase": "[NO]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/1e/2018new_no_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/1e/2018new_no_org.png","value": "[NO]","picid": ""}, {"phrase": "[haha]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/1d/2018new_hahashoushi_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/1d/2018new_hahashoushi_org.png","value": "[haha]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/9f/2018new_jiayou_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/9f/2018new_jiayou_org.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c6/hot_pigpeiqi_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c6/hot_pigpeiqi_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[????????????????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/b3/pikaqiu_weixiao_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/b3/pikaqiu_weixiao_thumb.png","value": "[????????????????????????]","picid": ""}, {"phrase": "[????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/93/xmax_oldman01_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/93/xmax_oldman01_thumb.png","value": "[????????????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e5/gongjiri_zijinhua_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e5/gongjiri_zijinhua_thumb.png","value": "[?????????]","picid": ""}, {"phrase": "[????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/93/gongyi_wenminglgnew_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/93/gongyi_wenminglgnew_thumb.png","value": "[????????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/60/horse2_org.gif","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/60/horse2_thumb.gif","value": "[??????]","picid": ""}, {"phrase": "[????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/b0/mdcg_org.gif","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/b0/mdcg_thumb.gif","value": "[????????????]","picid": ""}, {"phrase": "[????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e2/zhajibeer_org.gif","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e2/zhajibeer_thumb.gif","value": "[????????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/be/remen_zuiyou180605_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/be/remen_zuiyou180605_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[???]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/41/zz2_org.gif","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/41/zz2_thumb.gif","value": "[???]","picid": ""}, {"phrase": "[????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/10/2018zhongqiu_yuebing_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/10/2018zhongqiu_yuebing_thumb.png","value": "[????????????]","picid": ""}, {"phrase": "[???????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/ca/qixi2018_xiaoxinxin_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/ca/qixi2018_xiaoxinxin_thumb.png","value": "[???????????????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/0b/qixi2018_chigouliang_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/0b/qixi2018_chigouliang_thumb.png","value": "[?????????]","picid": ""}, {"phrase": "[??????????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/83/2018newyear_richdog_org.gif","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/83/2018newyear_richdog_thumb.gif","value": "[??????????????????]","picid": ""}, {"phrase": "[??????????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/f9/huodong_starsports_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/f9/huodong_starsports_thumb.png","value": "[??????????????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/fe/kanzhangv2_org.gif","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/fe/kanzhangv2_thumb.gif","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c5/kandiev2_org.gif","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c5/kandiev2_thumb.gif","value": "[??????]","picid": ""}, {"phrase": "[?????????????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/ec/eventtravel_org.gif","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/ec/eventtravel_thumb.gif","value": "[?????????????????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/76/hot_star171109_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/76/hot_star171109_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/f9/hot_halfstar_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/f9/hot_halfstar_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/ff/hot_blankstar_org.png","hot": false,"common": false,"category": "??????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/ff/hot_blankstar_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[???????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/f0/xhrnew_weixiao_org.png","hot": false,"common": false,"category": "?????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/f0/xhrnew_weixiao_org.png","value": "[???????????????]","picid": ""}, {"phrase": "[??????????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/63/xhrnew_jiandaoshou_org.png","hot": false,"common": false,"category": "?????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/63/xhrnew_jiandaoshou_org.png","value": "[??????????????????]","picid": ""}, {"phrase": "[???????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/b2/xhrnew_buxie_org.png","hot": false,"common": false,"category": "?????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/b2/xhrnew_buxie_org.png","value": "[???????????????]","picid": ""}, {"phrase": "[???????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/41/xhrnew_gaoxing_org.png","hot": false,"common": false,"category": "?????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/41/xhrnew_gaoxing_org.png","value": "[???????????????]","picid": ""}, {"phrase": "[???????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/fd/xhrnew_jingya_thumb.png","hot": false,"common": false,"category": "?????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/fd/xhrnew_jingya_thumb.png","value": "[???????????????]","picid": ""}, {"phrase": "[???????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/79/xhrnew_weiqu_org.png","hot": false,"common": false,"category": "?????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/79/xhrnew_weiqu_org.png","value": "[???????????????]","picid": ""}, {"phrase": "[???????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/be/xhrnew_huaixiao_thumb.png","hot": false,"common": false,"category": "?????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/be/xhrnew_huaixiao_thumb.png","value": "[???????????????]","picid": ""}, {"phrase": "[???????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e2/xhrnew_baiyan_org.png","hot": false,"common": false,"category": "?????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e2/xhrnew_baiyan_org.png","value": "[???????????????]","picid": ""}, {"phrase": "[???????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/15/xhrnew_wunai_org.png","hot": false,"common": false,"category": "?????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/15/xhrnew_wunai_thumb.png","value": "[???????????????]","picid": ""}, {"phrase": "[???????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c8/xhrnew_deyi_org.png","hot": false,"common": false,"category": "?????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/c8/xhrnew_deyi_thumb.png","value": "[???????????????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/27/avengers_ironman01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/27/avengers_ironman01_thumb.png","value": "[?????????]","picid": ""}, {"phrase": "[????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/d8/avengers_captain01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/d8/avengers_captain01_thumb.png","value": "[????????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/3c/avengers_thor01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/3c/avengers_thor01_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/44/avengers_hulk01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/44/avengers_hulk01_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/0e/avengers_blackwidow01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/0e/avengers_blackwidow01_thumb.png","value": "[?????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/93/avengers_clint01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/93/avengers_clint01_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/44/avengers_captainmarvel01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/44/avengers_captainmarvel01_thumb.png","value": "[????????????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/62/avengers_aokeye01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/62/avengers_aokeye01_thumb.png","value": "[?????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/cc/avengers_antman01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/cc/avengers_antman01_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/ce/avengers_thanos01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/ce/avengers_thanos01_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e2/avengers_spiderman01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/e2/avengers_spiderman01_thumb.png","value": "[?????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/1f/avengers_locki01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/1f/avengers_locki01_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/9c/avengers_drstranger01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/9c/avengers_drstranger01_thumb.png","value": "[????????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/91/avengers_wintersolider01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/91/avengers_wintersolider01_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/86/avengers_panther01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/86/avengers_panther01_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/a9/avengers_witch01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/a9/avengers_witch01_thumb.png","value": "[????????????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/07/avengers_vision01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/07/avengers_vision01_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[??????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/35/avengers_starlord01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/35/avengers_starlord01_thumb.png","value": "[??????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/7a/avengers_gelute01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/7a/avengers_gelute01_thumb.png","value": "[?????????]","picid": ""}, {"phrase": "[?????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/7c/avengers_mantis01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/7c/avengers_mantis01_thumb.png","value": "[?????????]","picid": ""}, {"phrase": "[????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/38/avengers_gauntlet01_org.png","hot": false,"common": false,"category": "???????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/38/avengers_gauntlet01_thumb.png","value": "[????????????]","picid": ""}, {"phrase": "[????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/d0/yunying_damaoluelue_org.png","hot": false,"common": false,"category": "????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/d0/yunying_damaoluelue_thumb.png","value": "[????????????]","picid": ""}, {"phrase": "[????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/4d/yunying_damaojingya_org.png","hot": false,"common": false,"category": "????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/4d/yunying_damaojingya_thumb.png","value": "[????????????]","picid": ""}, {"phrase": "[????????????]","type": "face","url": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/da/yunying_damaoweixiao_org.png","hot": false,"common": false,"category": "????????????","icon": "http://img.t.sinajs.cn/t4/appstyle/expression/ext/normal/da/yunying_damaoweixiao_thumb.png","value": "[????????????]","picid": ""}];
					var groups = {},
						categories = [],
						map = {};
					emotions.forEach(emotion => {
						var cate = emotion.category.length > 0 ? emotion.category : '??????';
						if (!groups[cate]) {
							groups[cate] = [];
							categories.push(cate);
						}
						groups[cate].push(emotion);
						map[emotion.phrase] = emotion.icon;
					});
					return {
						groups,
						categories,
						map
					};
				}
			}
		});
	});
}
});