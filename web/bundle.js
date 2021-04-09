(function (factory) {
    typeof define === 'function' && define.amd ? define(factory) :
    factory();
}((function () { 'use strict';

    // file: utils.ts
    (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    const _object_assign = Object.assign;
    const _object_hasOwnProperty = Object.prototype.hasOwnProperty;
    /** The name "utils" tells it all. */
    var utils = new class Utils {
        constructor() {
            // Time & formatting utils:
            this.fileSizeUnits = ['B', 'KB', 'MB', 'GB'];
            /**
             * Build a DOM tree from a JavaScript object.
             * @example utils.buildDOM({
                    tag: 'div.item#firstitem',
                    child: ['Name: ', { tag: 'span.name', textContent: name } ],
                })
             */
            this.buildDOM = null; // It will be initialized by view.ts
            this.jsxFactory = null;
            this.jsx = null;
        }
        strPadLeft(str, len, ch = ' ') {
            while (str.length < len) {
                str = ch + str;
            }
            return str;
        }
        formatTime(sec) {
            if (typeof sec !== 'number' || isNaN(sec))
                return '--:--';
            sec = Math.round(sec);
            var min = Math.floor(sec / 60);
            sec %= 60;
            return this.strPadLeft(min.toString(), 2, '0') + ':' + this.strPadLeft(sec.toString(), 2, '0');
        }
        formatFileSize(size) {
            if (typeof size !== "number" || isNaN(size))
                return 'NaN';
            var unit = 0;
            while (unit < this.fileSizeUnits.length - 1 && size >= 1024) {
                unit++;
                size /= 1024;
            }
            return size.toFixed(2) + ' ' + this.fileSizeUnits[unit];
        }
        formatDateTime(date) {
            var now = new Date();
            var sameday = date.getFullYear() === now.getFullYear()
                && date.getMonth() === now.getMonth()
                && date.getDate() === now.getDate();
            return sameday ? date.toLocaleTimeString() : date.toLocaleString();
        }
        numLimit(num, min, max) {
            return (num < min || typeof num != 'number' || isNaN(num)) ? min :
                (num > max) ? max : num;
        }
        createName(nameFunc, existsFunc) {
            for (let num = 0;; num++) {
                let str = nameFunc(num);
                if (!existsFunc(str))
                    return str;
            }
        }
        /**
         * btoa, but supports Unicode and uses UTF-8 encoding.
         * @see https://stackoverflow.com/questions/30106476
         */
        base64EncodeUtf8(str) {
            return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function toSolidBytes(match, p1) {
                return String.fromCharCode(('0x' + p1));
            }));
        }
        sleepAsync(time) {
            return new Promise((resolve) => {
                setTimeout(resolve, time);
            });
        }
        /** Remove all children from the node */
        clearChildren(node) {
            while (node.lastChild)
                node.removeChild(node.lastChild);
        }
        /** Remove all children from the node (if needed) and append one (if present) */
        replaceChild(node, newChild) {
            this.clearChildren(node);
            if (newChild)
                node.appendChild(newChild);
        }
        /** Add or remove a classname for the element
         * @param force - true -> add; false -> remove; undefined -> toggle.
         */
        toggleClass(element, clsName, force) {
            var clsList = element.classList;
            if (clsList.toggle)
                return clsList.toggle(clsName, force);
            if (force === undefined)
                force = !clsList.contains(clsName);
            if (force)
                clsList.add(clsName);
            else
                clsList.remove(clsName);
            return force;
        }
        /** Fade out the element and remove it */
        fadeout(element, options) {
            const { className = 'fading-out', duration = 500, waitTransition = true } = options || {};
            element.classList.add(className);
            var cb = null;
            var end = () => {
                if (!end)
                    return; // use a random variable as flag ;)
                end = null;
                if (waitTransition)
                    element.removeEventListener('transitionend', onTransitionend);
                element.classList.remove(className);
                element.remove();
                cb && cb();
            };
            if (waitTransition) {
                var onTransitionend = function (e) {
                    if (e.eventPhase === Event.AT_TARGET)
                        end();
                };
                element.addEventListener('transitionend', onTransitionend);
            }
            setTimeout(end, duration); // failsafe
            return {
                get finished() { return !end; },
                onFinished(callback) {
                    if (!end)
                        callback();
                    else
                        cb = callback;
                },
                cancel() { end === null || end === void 0 ? void 0 : end(); }
            };
        }
        listenPointerEvents(element, callback, options) {
            var touchDown = false;
            var mouseDown = function (e) {
                if (callback({ type: 'mouse', ev: e, point: e, action: 'down' }) === 'track') {
                    var mousemove = function (e) {
                        callback({ type: 'mouse', ev: e, point: e, action: 'move' });
                    };
                    var mouseup = function (e) {
                        document.removeEventListener('mousemove', mousemove, true);
                        document.removeEventListener('mouseup', mouseup, true);
                        callback({ type: 'mouse', ev: e, point: e, action: 'up' });
                    };
                    document.addEventListener('mousemove', mousemove, true);
                    document.addEventListener('mouseup', mouseup, true);
                }
            };
            var touchStart = function (e) {
                var ct = e.changedTouches[0];
                var ret = callback({
                    type: 'touch', touch: 'start', ev: e, point: ct,
                    action: touchDown ? 'move' : 'down'
                });
                if (!touchDown && ret === 'track') {
                    touchDown = true;
                    var touchmove = function (e) {
                        var ct = e.changedTouches[0];
                        callback({ type: 'touch', touch: 'move', ev: e, point: ct, action: 'move' });
                    };
                    var touchend = function (e) {
                        if (e.touches.length === 0) {
                            touchDown = false;
                            element.removeEventListener('touchmove', touchmove);
                            element.removeEventListener('touchend', touchend);
                            element.removeEventListener('touchcancel', touchend);
                        }
                        var ct = e.changedTouches[0];
                        callback({
                            type: 'touch', touch: 'end', ev: e, point: ct,
                            action: touchDown ? 'move' : 'up'
                        });
                    };
                    element.addEventListener('touchmove', touchmove, options);
                    element.addEventListener('touchend', touchend, options);
                    element.addEventListener('touchcancel', touchend, options);
                }
            };
            element.addEventListener('mousedown', mouseDown, options);
            element.addEventListener('touchstart', touchStart, options);
            return {
                remove: () => {
                    element.removeEventListener('mousedown', mouseDown, options);
                    element.removeEventListener('touchstart', touchStart, options);
                }
            };
        }
        listenEvent(element, event, handler) {
            element.addEventListener(event, handler);
            return {
                remove: () => element.removeEventListener(event, handler)
            };
        }
        listenEvents(element, events, handler) {
            events.forEach(event => element.addEventListener(event, handler));
            return {
                remove: () => events.forEach(event => element.removeEventListener(event, handler))
            };
        }
        injectCss(css, options) {
            var _a;
            document.head.appendChild(utils.buildDOM({ tag: (_a = options === null || options === void 0 ? void 0 : options.tag) !== null && _a !== void 0 ? _a : 'style', text: css }));
        }
        arrayRemove(array, val) {
            for (let i = 0; i < array.length; i++) {
                if (array[i] === val) {
                    array.splice(i, 1);
                    i--;
                }
            }
        }
        arrayInsert(array, val, pos) {
            if (pos === undefined)
                array.push(val);
            else
                array.splice(pos, 0, val);
        }
        arrayMap(arr, func) {
            if (arr instanceof Array)
                return arr.map(func);
            var idx = 0;
            var ret = new Array(arr.length);
            for (var item of arr) {
                ret[idx] = (func(item, idx));
                idx++;
            }
            return ret;
        }
        arrayForeach(arr, func) {
            var idx = 0;
            for (var item of arr) {
                func(item, idx++);
            }
        }
        arrayFind(arr, func) {
            if (arr instanceof Array)
                return arr.find(func);
            var idx = 0;
            for (var item of arr) {
                if (func(item, idx++))
                    return item;
            }
            return null;
        }
        arraySum(arr, func) {
            var sum = 0;
            this.arrayForeach(arr, (x) => {
                var val = func(x);
                if (val)
                    sum += val;
            });
            return sum;
        }
        objectApply(obj, kv, keys) {
            if (kv) {
                if (!keys)
                    return _object_assign(obj, kv);
                for (const key in kv) {
                    if (_object_hasOwnProperty.call(kv, key) && (!keys || keys.indexOf(key) >= 0)) {
                        const val = kv[key];
                        obj[key] = val;
                    }
                }
            }
            return obj;
        }
        objectInit(obj, kv, keys) {
            if (kv) {
                for (const key in kv) {
                    if (_object_hasOwnProperty.call(kv, key) && (!keys || keys.indexOf(key) >= 0)) {
                        const val = kv[key];
                        if (key.startsWith("on") && obj[key] instanceof Callbacks) {
                            obj[key].add(val);
                        }
                        else {
                            obj[key] = val;
                        }
                    }
                }
            }
            return obj;
        }
        mod(a, b) {
            if (a < 0)
                a = b + a;
            return a % b;
        }
        readBlobAsDataUrl(blob) {
            return new Promise((resolve, reject) => {
                var reader = new FileReader();
                reader.onload = (ev) => {
                    resolve(reader.result);
                };
                reader.onerror = (ev) => reject();
                reader.readAsDataURL(blob);
            });
        }
    };
    Array.prototype.remove = function (item) {
        utils.arrayRemove(this, item);
    };
    class Timer {
        constructor(callback) {
            this.callback = callback;
            this.cancelFunc = undefined;
        }
        timeout(time) {
            this.tryCancel();
            var handle = setTimeout(this.callback, time);
            this.cancelFunc = () => window.clearTimeout(handle);
        }
        interval(time) {
            this.tryCancel();
            var handle = setInterval(this.callback, time);
            this.cancelFunc = () => window.clearInterval(handle);
        }
        animationFrame() {
            this.tryCancel();
            var handle = requestAnimationFrame(this.callback);
            this.cancelFunc = () => cancelAnimationFrame(handle);
        }
        tryCancel() {
            if (this.cancelFunc) {
                this.cancelFunc();
                this.cancelFunc = undefined;
            }
        }
    }
    utils.Timer = Timer;
    class CallbacksImpl extends Array {
        constructor() {
            super(...arguments);
            this._hook = undefined;
        }
        get onChanged() {
            var _a;
            (_a = this._hook) !== null && _a !== void 0 ? _a : (this._hook = new Callbacks());
            return this._hook;
        }
        invoke(...args) {
            this.forEach((x) => {
                try {
                    x.apply(this, args);
                }
                catch (error) {
                    console.error("Error in callback", error);
                }
            });
        }
        add(callback) {
            var _a;
            this.push(callback);
            (_a = this._hook) === null || _a === void 0 ? void 0 : _a.invoke(true, callback);
            return callback;
        }
        remove(callback) {
            var _a;
            super.remove(callback);
            (_a = this._hook) === null || _a === void 0 ? void 0 : _a.invoke(false, callback);
        }
    }
    const Callbacks = CallbacksImpl;

    class BuildDOMCtx {
        constructor(dict) {
            this.dict = dict !== null && dict !== void 0 ? dict : {};
        }
        static EnsureCtx(ctxOrDict, origctx) {
            var ctx;
            if (ctxOrDict instanceof BuildDOMCtx)
                ctx = ctxOrDict;
            else
                ctx = new BuildDOMCtx(ctxOrDict);
            if (origctx) {
                if (!origctx.actions)
                    origctx.actions = [];
                ctx.actions = origctx.actions;
            }
            return ctx;
        }
        setDict(key, node) {
            if (!this.dict)
                this.dict = {};
            this.dict[key] = node;
        }
        addUpdateAction(action) {
            if (!this.actions)
                this.actions = [];
            this.actions.push(action);
            // BuildDOMCtx.executeAction(action);
        }
        update() {
            if (!this.actions)
                return;
            for (const a of this.actions) {
                BuildDOMCtx.executeAction(a);
            }
        }
        static executeAction(a) {
            switch (a[0]) {
                case 'text':
                    a[1].textContent = a[2]();
                    break;
                case 'hidden':
                    a[1].hidden = a[2]();
                    break;
                case 'update':
                    a[2](a[1]);
                    break;
                default:
                    console.warn('unknown action', a);
                    break;
            }
        }
    }
    var createElementFromTag = function (tag) {
        var reg = /[#\.^]?[\w\-]+/y;
        var match;
        var ele;
        while (match = reg.exec(tag)) {
            var val = match[0];
            var ch = val[0];
            if (ch === '.') {
                ele.classList.add(val.substr(1));
            }
            else if (ch === '#') {
                ele.id = val.substr(1);
            }
            else {
                if (ele)
                    throw new Error('unexpected multiple tags');
                ele = document.createElement(val);
            }
        }
        return ele;
    };
    function tryHandleValues(obj, ctx) {
        if (typeof (obj) === 'string') {
            return document.createTextNode(obj);
        }
        if (typeof obj === 'function') {
            const val = obj();
            if (!val || typeof val !== 'object') {
                const node = document.createTextNode(val);
                ctx === null || ctx === void 0 ? void 0 : ctx.addUpdateAction(['text', node, obj]);
                return node;
            }
            else {
                throw new Error('Unexpected function return value');
            }
        }
        if (Node && obj instanceof Node)
            return obj;
        return null;
    }
    var buildDomCore = function (obj, ttl, ctx) {
        if (ttl-- < 0)
            throw new Error('ran out of TTL');
        var r = tryHandleValues(obj, ctx);
        if (r)
            return r;
        if (obj instanceof JsxNode)
            return obj.buildDom(ctx, ttl);
        if ('getDOM' in obj)
            return obj.getDOM();
        const tag = obj.tag;
        if (!tag)
            throw new Error('no tag');
        var node = createElementFromTag(tag);
        if (obj['_ctx'])
            ctx = BuildDOMCtx.EnsureCtx(obj['_ctx'], ctx);
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                var val = obj[key];
                buildDOMHandleKey(key, val, node, ctx, ttl);
            }
        }
        const init = obj['init'];
        if (init)
            init(node);
        return node;
    };
    var buildDOMHandleKey = function (key, val, node, ctx, ttl) {
        if (key === 'child') {
            if (val instanceof Array) {
                val.forEach(function (val) {
                    if (val instanceof Array) {
                        val.forEach(function (val) {
                            node.appendChild(buildDomCore(val, ttl, ctx));
                        });
                    }
                    else {
                        node.appendChild(buildDomCore(val, ttl, ctx));
                    }
                });
            }
            else {
                node.appendChild(buildDomCore(val, ttl, ctx));
            }
        }
        else if (key === '_key') {
            ctx.setDict(val, node);
        }
        else if (key === 'ref') {
            val.value = node;
        }
        else if (key === 'text') {
            if (typeof val === 'function') {
                ctx.addUpdateAction(['text', node, val]);
            }
            else {
                node.textContent = val;
            }
        }
        else if (key === 'class') {
            node.className = val;
        }
        else if (key === 'hidden' && typeof val === 'function') {
            ctx.addUpdateAction(['hidden', node, val]);
        }
        else if (key === 'update' && typeof val === 'function') {
            ctx.addUpdateAction(['update', node, val]);
        }
        else if (key === 'init') ;
        else {
            node[key] = val;
        }
    };
    utils.buildDOM = function (obj, ctx) {
        return buildDomCore(obj, 32, ctx);
    };
    class JsxNode {
        constructor(tag, attrs, childs) {
            this.tag = tag;
            this.attrs = attrs;
            this.child = childs;
        }
        getDOM() {
            return this.buildDom(null, 64);
        }
        buildDom(ctx, ttl) {
            return this.buildView(ctx, ttl).getDOM();
        }
        buildView(ctx, ttl) {
            if (ttl-- < 0)
                throw new Error('ran out of TTL');
            let view;
            if (typeof this.tag === 'string') {
                const dom = document.createElement(this.tag);
                view = dom;
                if (this.attrs) {
                    for (const key in this.attrs) {
                        if (Object.prototype.hasOwnProperty.call(this.attrs, key)) {
                            const val = this.attrs[key];
                            buildDOMHandleKey(key, val, dom, ctx, ttl);
                        }
                    }
                    const init = this.attrs['init'];
                    if (init)
                        init(dom);
                }
            }
            else {
                view = this.tag;
                if (this.attrs) {
                    let init = null;
                    for (const key in this.attrs) {
                        if (Object.prototype.hasOwnProperty.call(this.attrs, key)) {
                            const val = this.attrs[key];
                            if (key == "init") {
                                init = val;
                            }
                            else if (key == "ref") {
                                val.value = view;
                            }
                            else if (key.startsWith("on") && view[key] instanceof Callbacks) {
                                view[key].add(val);
                            }
                            else {
                                view[key] = val;
                            }
                        }
                    }
                    if (init)
                        init(view);
                }
            }
            if (this.child)
                for (const it of this.child) {
                    if (it instanceof Array) {
                        it.forEach(it => view.addChild(jsxBuildCore(it, ttl, ctx)));
                    }
                    else {
                        view.addChild(jsxBuildCore(it, ttl, ctx));
                    }
                }
            return view;
        }
        addChild(child) {
            if (this.child == null)
                this.child = [];
            this.child.push(child);
        }
    }
    function jsxBuildCore(node, ttl, ctx) {
        if (ttl-- < 0)
            throw new Error('ran out of TTL');
        if (node instanceof View)
            return node;
        var r = tryHandleValues(node, ctx);
        if (r)
            return r;
        if (node instanceof JsxNode) {
            return node.buildView(ctx, ttl);
        }
        else {
            console.error("Unknown node type", node);
            throw new Error("Unknown node type");
        }
    }
    function jsxFactory(tag, attrs, ...childs) {
        if (typeof tag === 'string') {
            return new JsxNode(tag, attrs, childs);
        }
        else {
            const view = (attrs === null || attrs === void 0 ? void 0 : attrs.args) ?
                new tag(...attrs.args) :
                new tag();
            return new JsxNode(view, attrs, childs);
        }
    }
    const jsx = utils.jsx = utils.jsxFactory = jsxFactory;
    class View {
        constructor(dom) {
            this.parentView = undefined;
            this._position = undefined;
            this.domctx = new BuildDOMCtx();
            this._dom = undefined;
            this._onActive = undefined;
            if (dom)
                this.domExprCreated(dom);
        }
        static getView(obj) { return obj instanceof View ? obj : new View(obj); }
        get position() { return this._position; }
        get domCreated() { return !!this._dom; }
        get dom() {
            this.ensureDom();
            return this._dom;
        }
        get hidden() { return this.dom.hidden; }
        set hidden(val) { this.dom.hidden = val; }
        ensureDom() {
            if (!this._dom) {
                var r = this.createDom();
                this.domExprCreated(r);
            }
        }
        domExprCreated(r) {
            this._dom = utils.buildDOM(r, this.domctx);
            this.postCreateDom();
            this.updateDom();
        }
        createDom() {
            return document.createElement('div');
        }
        /** Will be called when the dom is created */
        postCreateDom() {
        }
        /** Will be called when the dom is created, after postCreateDom() */
        updateDom() {
            this.domctx.update();
        }
        /** Assign key-values and call `updateDom()` */
        updateWith(kv) {
            utils.objectApply(this, kv);
            this.updateDom();
        }
        toggleClass(clsName, force) {
            utils.toggleClass(this.dom, clsName, force);
        }
        appendView(view) { return this.dom.appendView(view); }
        getDOM() { return this.dom; }
        addChild(child) {
            if (child instanceof View) {
                this.appendView(child);
            }
            else {
                this.dom.appendChild(utils.buildDOM(child));
            }
        }
        get onActive() {
            if (!this._onActive) {
                this._onActive = new Callbacks();
                this.dom.addEventListener('click', (e) => {
                    this._onActive.invoke(e);
                });
                this.dom.addEventListener('keydown', (e) => {
                    this.handleKeyDown(e);
                });
            }
            return this._onActive;
        }
        handleKeyDown(e) {
            var _a;
            if (e.code === 'Enter') {
                const rect = this.dom.getBoundingClientRect();
                (_a = this._onActive) === null || _a === void 0 ? void 0 : _a.invoke(new MouseEvent('click', {
                    clientX: rect.x, clientY: rect.y,
                    relatedTarget: this.dom
                }));
                e.preventDefault();
            }
        }
    }
    Node.prototype.getDOM = function () { return this; };
    Node.prototype.addChild = function (child) {
        this.appendChild(utils.buildDOM(child));
    };
    Node.prototype.appendView = function (view) {
        this.appendChild(view.dom);
    };
    class ContainerView extends View {
        constructor() {
            super(...arguments);
            this.items = [];
        }
        appendView(view) {
            this.addView(view);
        }
        addView(view, pos) {
            const items = this.items;
            if (view.parentView)
                throw new Error('the view is already in a container view');
            view.parentView = this;
            if (pos === undefined) {
                view._position = items.length;
                items.push(view);
                this._insertToDom(view, items.length - 1);
            }
            else {
                items.splice(pos, 0, view);
                for (let i = pos; i < items.length; i++) {
                    items[i]._position = i;
                }
                this._insertToDom(view, pos);
            }
        }
        removeView(view) {
            view = this._ensureItem(view);
            this._removeFromDom(view);
            var pos = view._position;
            view.parentView = view._position = undefined;
            this.items.splice(pos, 1);
            for (let i = pos; i < this.items.length; i++) {
                this.items[i]._position = i;
            }
        }
        removeAllView() {
            while (this.length)
                this.removeView(this.length - 1);
        }
        updateChildrenDom() {
            for (const item of this.items) {
                item.updateDom();
            }
        }
        _insertToDom(item, pos) {
            var _a;
            if (pos == this.items.length - 1)
                this.dom.appendChild(item.dom);
            else
                this.dom.insertBefore(item.dom, ((_a = this.items[pos + 1]) === null || _a === void 0 ? void 0 : _a.dom) || null);
        }
        _removeFromDom(item) {
            if (item.domCreated)
                item.dom.remove();
        }
        _ensureItem(item) {
            if (typeof item === 'number')
                item = this.items[item];
            else if (!item)
                throw new Error('item is null or undefined.');
            else if (item.parentView !== this)
                throw new Error('the item is not in this listview.');
            return item;
        }
        [Symbol.iterator]() { return this.items[Symbol.iterator](); }
        get length() { return this.items.length; }
        get(idx) {
            return this.items[idx];
        }
        map(func) { return utils.arrayMap(this, func); }
        find(func) { return utils.arrayFind(this, func); }
        forEach(func) { return utils.arrayForeach(this, func); }
    }

    var css$1 = ":root {\n    --color-bg: white;\n    --color-text: black;\n    --color-text-gray: #666;\n    --color-bg-selection: hsl(5, 100%, 85%);\n    --color-primary: hsl(5, 100%, 67%);\n    --color-primary-darker: hsl(5, 100%, 60%);\n    --color-primary-dark: hsl(5, 100%, 40%);\n    --color-primary-dark-depends: hsl(5, 100%, 40%);\n    --color-primary-verydark: hsl(5, 100%, 20%);\n    --color-primary-light: hsl(5, 100%, 83%);\n    --color-primary-lighter: hsl(5, 100%, 70%);\n    --color-fg-11: #111111;\n    --color-fg-22: #222222;\n    --color-fg-33: #333333;\n    --color-bg-cc: #cccccc;\n    --color-bg-dd: #dddddd;\n    --color-bg-ee: #eeeeee;\n    --color-bg-f8: #f8f8f8;\n    --color-shadow: rgba(0, 0, 0, .5);\n}\n\n.no-selection {\n    user-select: none;\n    -ms-user-select: none;\n    -moz-user-select: none;\n    -webkit-user-select: none;\n}\n\n/* listview item */\n\n.item {\n    display: block;\n    position: relative;\n    padding: 10px;\n    /* background: #ddd; */\n    /* animation: showing .3s forwards; */\n    text-decoration: none;\n    line-height: 1.2;\n}\n\na.item {\n    color: inherit;\n}\n\n.clickable, .item {\n    cursor: pointer;\n    transition: transform .3s;\n    -webkit-tap-highlight-color: transparent;\n}\n\n.item:hover, .dragover {\n    background: var(--color-bg-ee);\n}\n\n.keyboard-input .item:focus {\n    outline-offset: -2px;\n}\n\n.dragover-placeholder {\n    /* border-top: 2px solid gray; */\n    position: relative;\n}\n\n.dragover-placeholder::before {\n    content: \"\";\n    display: block;\n    position: absolute;\n    transform: translate(0, -1px);\n    height: 2px;\n    width: 100%;\n    background: gray;\n    z-index: 100;\n    pointer-events: none;\n}\n\n.clickable:active, .item:active {\n    transition: transform .07s;\n    transform: scale(.97);\n}\n\n.item:active {\n    background: var(--color-bg-dd);\n}\n\n.item.no-transform:active {\n    transform: none;\n}\n\n.item.active {\n    background: var(--color-bg-dd);\n}\n\n.loading-indicator {\n    position: relative;\n    margin: .3em;\n    margin-top: 3em;\n    margin-bottom: 1em;\n    text-align: center;\n    white-space: pre-wrap;\n    cursor: default;\n    animation: loading-fadein .3s;\n}\n\n.loading-indicator-text {\n    margin: 0 auto;\n}\n\n.loading-indicator.running .loading-indicator-inner {\n    display: inline-block;\n    position: relative;\n    vertical-align: bottom;\n}\n\n.loading-indicator.running .loading-indicator-inner::after {\n    content: \"\";\n    height: 1px;\n    margin: 0%;\n    background: var(--color-text);\n    display: block;\n    animation: fadein .5s 1s backwards;\n}\n\n.loading-indicator.running .loading-indicator-text {\n    margin: 0 .5em;\n    animation: fadein .3s, loading-first .3s .5s cubic-bezier(0.55, 0.055, 0.675, 0.19) reverse, loading-second .3s .8s cubic-bezier(0.55, 0.055, 0.675, 0.19), loading .25s 1.1s cubic-bezier(0.55, 0.055, 0.675, 0.19) alternate-reverse infinite;\n}\n\n.loading-indicator.error {\n    color: red;\n}\n\n.loading-indicator.fading-out {\n    transition: max-height;\n    animation: loading-fadein .3s reverse;\n}\n\n@keyframes loading-fadein {\n    0% {\n        opacity: 0;\n        max-height: 0;\n    }\n    100% {\n        opacity: 1;\n        max-height: 200px;\n    }\n}\n\n@keyframes fadein {\n    0% {\n        opacity: 0;\n    }\n    100% {\n        opacity: 1;\n    }\n}\n\n@keyframes loading-first {\n    0% {\n        transform: translate(0, -2em) scale(1) rotate(360deg);\n    }\n    100% {\n        transform: translate(0, 0) scale(1) rotate(0deg);\n    }\n}\n\n@keyframes loading-second {\n    0% {\n        transform: translate(0, -2em);\n    }\n    100% {\n        transform: translate(0, 0);\n    }\n}\n\n@keyframes loading {\n    0% {\n        transform: translate(0, -1em);\n    }\n    100% {\n        transform: translate(0, 0);\n    }\n}\n\n@keyframes showing {\n    0% {\n        opacity: .3;\n        transform: translate(-20px, 0)\n    }\n    100% {\n        opacity: 1;\n        transform: translate(0, 0)\n    }\n}\n\n@keyframes showing-top {\n    0% {\n        opacity: .3;\n        transform: translate(0, -20px)\n    }\n    100% {\n        opacity: 1;\n        transform: translate(0, 0)\n    }\n}\n\n@keyframes showing-right {\n    0% {\n        opacity: .3;\n        transform: translate(20px, 0)\n    }\n    100% {\n        opacity: 1;\n        transform: translate(0, 0)\n    }\n}\n\n.overlay {\n    background: rgba(0, 0, 0, .2);\n    position: absolute;\n    top: 0;\n    left: 0;\n    right: 0;\n    bottom: 0;\n    animation: fadein .3s;\n    z-index: 10001;\n    overflow: hidden;\n    contain: strict;\n    will-change: transform;\n}\n\n.overlay.fixed {\n    position: fixed;\n}\n\n.overlay.nobg {\n    background: none;\n    will-change: auto;\n}\n\n.overlay.centerchild {\n    display: flex;\n    align-items: center;\n    justify-content: center;\n}\n\n.dialog * {\n    box-sizing: border-box;\n}\n\n.dialog {\n    font-size: 14px;\n    position: relative;\n    overflow: auto;\n    background: var(--color-bg);\n    border-radius: 5px;\n    box-shadow: 0 0 12px var(--color-shadow);\n    animation: dialogin .2s ease-out;\n    z-index: 10001;\n    display: flex;\n    flex-direction: column;\n    max-height: 100%;\n    contain: content;\n    will-change: transform;\n}\n\n.dialog.resize {\n    resize: both;\n}\n\n.fading-out .dialog {\n    transition: transform .3s ease-in;\n    transform: scale(.85);\n}\n\n.dialog-title, .dialog-content, .dialog-bottom {\n    padding: 10px;\n}\n\n.dialog-title {\n    background: var(--color-bg-ee);\n}\n\n.dialog-content {\n    flex: 1;\n    padding: 5px 10px;\n    overflow: auto;\n}\n\n.dialog-content.flex {\n    display: flex;\n    flex-direction: column;\n}\n\n.dialog-bottom {\n    padding: 5px 10px;\n}\n\n@keyframes dialogin {\n    0% {\n        transform: scale(.85);\n    }\n    100% {\n        transform: scale(1);\n    }\n}\n\n.input-label {\n    font-size: 80%;\n    color: var(--color-text-gray);\n    margin: 5px 0 3px 0;\n}\n\n.input-text {\n    display: block;\n    width: 100%;\n    padding: 5px;\n    border: solid 1px gray;\n    background: var(--color-bg);\n    color: var(--color-text);\n}\n\n.dialog .input-text {\n    margin: 5px 0;\n}\n\ntextarea.input-text {\n    resize: vertical;\n}\n\n.labeled-input {\n    display: flex;\n    flex-direction: column;\n}\n\n.labeled-input .input-text {\n    flex: 1;\n}\n\n.labeled-input:focus-within .input-label {\n    color: var(--color-primary-darker);\n}\n\n.input-text:focus {\n    border-color: var(--color-primary-darker);\n}\n\n.input-text:active {\n    border-color: var(--color-primary-dark);\n}\n\n.btn {\n    display: block;\n    text-align: center;\n    transition: all .2s;\n    padding: 0 .4em;\n    min-width: 3em;\n    line-height: 1.5em;\n    background: var(--color-primary);\n    color: white;\n    text-shadow: 0 0 4px var(--color-primary-verydark);\n    box-shadow: 0 0 3px var(--color-shadow);\n    cursor: pointer;\n    -ms-user-select: none;\n    -moz-user-select: none;\n    -webkit-user-select: none;\n    user-select: none;\n    position: relative;\n    overflow: hidden;\n}\n\n.btn:hover {\n    transition: all .05s;\n    background: var(--color-primary-darker);\n}\n\n.btn.btn-down, .btn:active {\n    transition: all .05s;\n    background: var(--color-primary-dark);\n    box-shadow: 0 0 1px var(--color-shadow);\n}\n\n.btn.disabled {\n    background: var(--color-primary-light);\n}\n\n.dialog .btn {\n    margin: 10px 0;\n}\n\n.btn-big {\n    padding: 5px;\n}\n\n.btn-inline {\n    display: inline;\n}\n\n.tab {\n    display: inline-block;\n    color: var(--color-text-gray);\n    margin: 0 5px;\n}\n\n.tab.active {\n    color: var(--color-text);\n}\n\n*[hidden] {\n    display: none !important;\n}\n\n.context-menu {\n    position: absolute;\n    overflow-y: auto;\n    background: var(--color-bg);\n    border: solid 1px #777;\n    box-shadow: 0 0px 12px var(--color-shadow);\n    min-width: 100px;\n    max-width: 450px;\n    outline: none;\n    z-index: 10001;\n    animation: context-menu-in .2s ease-out forwards;\n    will-change: transform;\n}\n\n.context-menu .item.dangerous {\n    transition: color .3s, background .3s;\n    color: red;\n}\n\n.context-menu .item.dangerous:hover {\n    transition: color .1s, background .1s;\n    background: red;\n    color: white;\n}\n\n@keyframes context-menu-in {\n    0% {\n        transform: scale(.9);\n    }\n    100% {\n        transform: scale(1);\n    }\n}\n\n*.menu-shown {\n    background: var(--color-bg-dd);\n}\n\n.menu-info {\n    white-space: pre-wrap;\n    color: var(--color-text-gray);\n    padding: 5px 10px;\n    /* animation: showing .3s; */\n    cursor: default;\n}\n\n.toasts-container {\n    position: fixed;\n    bottom: 0;\n    right: 0;\n    padding: 5px;\n    width: 300px;\n    z-index: 10001;\n    overflow: hidden;\n}\n\n.toast {\n    margin: 5px;\n    padding: 10px;\n    border-radius: 5px;\n    box-shadow: 0 0 10px var(--color-shadow);\n    background: var(--color-bg);\n    white-space: pre-wrap;\n    animation: showing-right .3s;\n}\n\n.fading-out {\n    transition: opacity .3s;\n    opacity: 0;\n    pointer-events: none;\n}\n\n.anchor-bottom {\n    transform: translate(-50%, -100%);\n}\n\n.tooltip {\n    position: absolute;\n    background: var(--color-bg);\n    box-shadow: 0 0 5px var(--color-shadow);\n    border-radius: 5px;\n    padding: .2em .25em;\n}\n";

    // file: viewlib.ts
    (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
        function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };
    function getWebfxCss() { return css$1; }
    let cssInjected = false;
    function injectWebfxCss() {
        if (!cssInjected) {
            utils.injectCss(getWebfxCss(), { tag: 'style.webfx-injected-style' });
            cssInjected = true;
        }
    }
    /** DragManager is used to help exchange information between views */
    new class DragManager {
        constructor() {
            /** The item being dragged */
            this._currentItem = null;
            this._currentArray = null;
            this.onDragStart = new Callbacks();
            this.onDragEnd = new Callbacks();
        }
        get currentItem() { var _a, _b, _c; return (_c = (_a = this._currentItem) !== null && _a !== void 0 ? _a : (_b = this._currentArray) === null || _b === void 0 ? void 0 : _b[0]) !== null && _c !== void 0 ? _c : null; }
        ;
        get currentArray() {
            if (this._currentItem)
                return [this._currentItem];
            return this._currentArray;
        }
        start(item) {
            this._currentItem = item;
            console.log('drag start', item);
            this.onDragStart.invoke();
        }
        startArray(arr) {
            this._currentArray = arr;
            console.log('drag start array', arr);
            this.onDragStart.invoke();
        }
        end() {
            this._currentItem = null;
            this._currentArray = null;
            console.log('drag end');
            this.onDragEnd.invoke();
        }
    };
    class InputView extends View {
        constructor(init) {
            super();
            this.multiline = false;
            this.type = 'text';
            this.placeholder = '';
            utils.objectInit(this, init);
        }
        get value() { return this.dom.value; }
        set value(val) { this.dom.value = val; }
        createDom() {
            return this.multiline ? { tag: 'textarea.input-text' } : { tag: 'input.input-text' };
        }
        updateDom() {
            super.updateDom();
            if (this.dom instanceof HTMLInputElement) {
                this.dom.type = this.type;
                this.dom.placeholder = this.placeholder;
            }
        }
    }
    class TextView extends View {
        get text() { return this.dom.textContent; }
        set text(val) { this.dom.textContent = val; }
    }
    class ButtonView extends TextView {
        constructor(init) {
            super();
            this.disabled = false;
            this.type = 'normal';
            utils.objectInit(this, init);
            this.updateDom();
        }
        createDom() {
            return { tag: 'div.btn', tabIndex: 0 };
        }
        updateDom() {
            super.updateDom();
            this.toggleClass('disabled', this.disabled);
            this.toggleClass('btn-big', this.type === 'big');
            this.toggleClass('btn-inline', this.type === 'inline');
        }
    }
    var FlagsInput;
    (function (FlagsInput_1) {
        class FlagsInput extends ContainerView {
            constructor(flags) {
                super();
                flags === null || flags === void 0 ? void 0 : flags.forEach(f => {
                    var flag = f instanceof Flag ? f : new Flag({ text: Object.prototype.toString.call(f) });
                    this.addView(flag);
                });
            }
            createDom() {
                return { tag: 'div.flags-input' };
            }
        }
        FlagsInput_1.FlagsInput = FlagsInput;
        class Flag extends TextView {
            get parentInput() { return this.parentView; }
            constructor(init) {
                super();
                utils.objectInit(this, init);
            }
            createDom() {
                return { tag: 'div.flags-input-item' };
            }
        }
        FlagsInput_1.Flag = Flag;
    })(FlagsInput || (FlagsInput = {}));
    class ToastsContainer extends View {
        constructor() {
            super(...arguments);
            this.parentDom = null;
            this.toasts = [];
        }
        createDom() {
            return { tag: 'div.toasts-container' };
        }
        addToast(toast) {
            if (this.toasts.length === 0)
                this.show();
            this.toasts.push(toast);
        }
        removeToast(toast) {
            this.toasts.remove(toast);
            if (this.toasts.length === 0)
                this.remove();
        }
        show() {
            var parent = this.parentDom || document.body;
            parent.appendChild(this.dom);
        }
        remove() {
            this.dom.remove();
        }
    }
    ToastsContainer.default = new ToastsContainer();

    var css = "* {\r\n    box-sizing: border-box;\r\n}\r\n\r\nhtml {\r\n    font-family: sans-serif;\r\n}\r\n\r\n.app {\r\n    max-width: 800px;\r\n    margin: 0 auto;\r\n}\r\n\r\n#title {\r\n    font-size: 50px;\r\n    text-align: center;\r\n}\r\n\r\n#pipe-action-btns {\r\n    margin: .5em 0;\r\n    text-align: center;\r\n}\r\n\r\n.btn-group .btn {\r\n    display: inline-block;\r\n}\r\n\r\n#pipe-action-btns .btn {\r\n    margin: 0 2em;\r\n    padding: .2em;\r\n    min-width: 7em;\r\n}\r\n\r\n#pipe-action-btns .btn-group {\r\n    display: inline-block;\r\n    \r\n}";

    injectWebfxCss();
    utils.injectCss(css);
    class App extends View {
        constructor() {
            super(...arguments);
            this.inputView = new InputView({ placeholder: "URL or pipe name" });
        }
        createDom() {
            return jsx("main", { class: "app" },
                jsx("h1", { id: "title" }, "Pipe"),
                this.inputView,
                jsx("div", { id: "pipe-action-btns" },
                    jsx("div", { class: "btn-group" },
                        jsx(ButtonView, null, "Upload file"),
                        jsx(ButtonView, null, "Upload text")),
                    jsx("div", { class: "btn-group" },
                        jsx(ButtonView, null, "Download file"),
                        jsx(ButtonView, null, "Raw"))));
        }
        postCreateDom() {
            this.inputView.dom.name = 'pipe';
        }
    }
    var app = new App();
    document.body.appendChild(app.dom);

})));
