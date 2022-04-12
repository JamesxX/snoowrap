import axios, { AxiosRequestConfig } from 'axios'
import {stringify as createQueryString} from 'querystring'
import { isBrowser } from '../utility/polyfills'
import snoowrap from './snoowrap';

const FormData = isBrowser ? global.FormData : require('form-data');

declare module 'axios' {
    export interface AxiosRequestConfig {
        form?: {
            [key: string]: any
        }
        formData?: {
            [key: string]: any
        }
        _r?: snoowrap
        body?: any
        qs?: any
    }
  }

axios.interceptors.request.use(async (config: AxiosRequestConfig) => {
    const isSpreadable = val => typeof val !== 'string' && !(val instanceof Array);
    const has = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
  

    config.headers = isSpreadable(config.headers) ? {...config.headers} : {};
    config.params = isSpreadable(config.params) ? {...config.params} : {};
    config.params = isSpreadable(config.qs) ? {...config.qs, ...config.params} : config.params;
    config.formData = isSpreadable(config.formData) ? {...config.formData} : {};
    config.form = isSpreadable(config.form) ? {...config.form} : {};
  
    const requestHeaders = {};
    Object.keys(config.headers).forEach(key => {
        const newKey = key.toLowerCase();
        if (!isBrowser || newKey !== 'user-agent') {
            requestHeaders[newKey] = config.headers[key];
        }
    });

    config.headers = requestHeaders;
  
    let requestBody;
    if (Object.keys(config.formData).length) {
        requestBody = new FormData();
        Object.keys(config.formData).forEach(key => requestBody.append(key, config.formData[key]));
        if (!isBrowser) {
            const contentLength = await new Promise((resolve, reject) => {
                requestBody.getLength((err, length) => {
                    if (err) { reject(err); }
                    resolve(length);
                });
            });
            config.headers['content-length'] = contentLength;
            config.headers['content-type'] = `multipart/form-data; boundary=${requestBody._boundary}`;
        }
    } else if (Object.keys(config.form).length) {
        requestBody = createQueryString(config.form);
        config.headers['content-type'] = 'application/x-www-form-urlencoded';
    } else {
        requestBody = config.data || config.body;
    }
    config.data = requestBody;
  
    if (config.auth) {
        if (has(config.auth, 'bearer')) {
            config.headers.authorization = `Bearer ${config.auth.bearer}`;
        } else if (has(config.auth, 'user') && has(config.auth, 'pass')) {
            config.auth.username = config.auth.user;
            config.auth.password = config.auth.pass;
        }
    }
  
    if (config._r && config._r.debug) {
        config._r.debug('Request:', config);
    }
    return config;
});
  
axios.interceptors.response.use(response => {
    if (response.config._r && response.config._r.debug) {
        response.config._r.debug('Response:', response);
    }
    return response;
});
  
export default axios