/*import reset from 'reset.css'
import Vue from 'vue';
import VueRouter from 'vue-router';
import VueI18n from 'vue-i18n';*/

/*import Test from './test';

import TestComponent from './test.vue'*/
import Vue from 'vue';
import VueRouter from 'vue-router';
import VueI18n from 'vue-i18n';
import VueTimers from 'vue-timers';
import MainCompnent from './components/main.vue';

Vue.use(VueRouter);
Vue.use(VueI18n);
Vue.use(VueTimers);

const element = document.createElement('div');
element.id = 'vue';
document.body.appendChild(element);
const vue = new Vue(MainCompnent).$mount(element);
vue.$i18n.locale = 'zh';
(<any>window).vue = vue;
