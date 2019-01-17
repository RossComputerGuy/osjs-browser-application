import osjs from 'osjs';
import {name as applicationName} from './metadata.json';

import {app,h} from 'hyperapp';
import {Box,BoxContainer,Button,Iframe,Menubar,MenubarItem,Tabs,TextField} from '@osjs/gui';

import * as languages from './locales';

const HTMLCollectionIndexOf = (coll,elem) => {
  let elems = [];
  for(let i = 0;i < coll.length;i++) elems[i] = coll[i];
  return elems.indexOf(elem);
};

class BrowserTab {
  constructor(actions,url,proc,core,_,index) {
    if(url.split(':')[0] == 'about') url = proc.resource('/src/about/'+url.split(':')[1]+'.html');
    else url = proc.resource('/proxy/'+url);
    this.h = h(BoxContainer,{ grow: 1 },[h(Iframe,{
      box: { grow: 1 },
      src: url,
      style: { border: 'none' },
      oncreate: elem => {
        this.elem = elem;
        this.document = elem.contentDocument;
        this.window = elem.contentWindow;
      },
      onload: ev => {
        if(ev.target.contentDocument.title.length == 0) ev.target.contentDocument.title = url;
        this.document = ev.target.contentDocument;
        this.window = ev.target.contentWindow;
        this.elem = ev.target;
        this.title = this.document.title || _('NEWTAB');
        if(actions) actions.setTitle(this,this.title);
      }
    })]);
    this.log = [];
    this.url = url;
    this.title = _('NEWTAB');
    this.index = index;
  }
}

const register = (core,args,options,metadata) => {
  const proc = core.make('osjs/application',{args,options,metadata});
  const {translatable} = core.make('osjs/locale');
  const _ = translatable(languages);
  proc.createWindow({
    id: 'BrowserWindow',
    title: _('TITLE'),
		icon: proc.resource(metadata.icon),
    dimension: {width: 400,height: 400},
    position: {left: 700,top: 200}
  }).on('destroy',() => proc.destroy()).render(($content,win) => {
    app({
      url: proc.args.url || core.config('webbrowser.homepage') || 'about:newtab',
      tab: 0,
      tabs: [
        new BrowserTab(null,proc.args.url || 'about:newtab',proc,core,_,0)
      ]
    },{
      setTab: i => state => ({
        tab: i
      }),
      addTab: () => (state,actions) => ({
        tabs: [
          ...state.tabs,
          new BrowserTab(actions,'about:newtab',proc,core,_,state.tabs.length)
        ],
        url: state.url,
        tab: state.tab
      }),
      setTitle: (tab,title) => (state,actions) => {
        const found = state.tabs.findIndex(t => t == tab);
        if(found != -1) {
          if(typeof(title) == 'undefined') title = tab.title;
          state.tabs[found].title = title;
          return { tabs: state.tabs };
        }
        return state;
      },
      removeTab: i => state => {
        if(state.tabs.length == 1) proc.destroy();
        return {
          tabs: state.tabs.filter((elem,index) => index != i),
          url: state.url,
          tab: state.tab
        };
      },
      loadURL: () => (state,actions) => {
        console.log(state.tab);
        state.tabs[state.tab] = new BrowserTab(actions,state.url,proc,core,_,state.tab);
        return { tabs: state.tabs };
      },
			menuFile: ev => (state,actions) => {
				core.make('osjs/contextmenu').show({
					position: ev.target,
					menu: [
					  { label: _('REFRESH'), onclick: () => {
					    console.log(state);
					    state.tabs[state.tab].elem.contentWindow.location.reload();
					  } },
					  { type: 'separator' },
					  { label: _('NEWTAB'), onclick: () => actions.addTab() },
					  { label: _('CLOSETAB'), onclick: () => {
					    actions.removeTab(state.tab);
					    if(state.tabs.length == 0) proc.destroy();
					  } },
					  { type: 'separator' },
						{ label: _('QUIT'), onclick: () => proc.destroy() }
				  ]
				});
		  },
      setInput: ({name,value}) => () => ({[name]: value}),
      getState: () => state => state
    },(state,actions) => h(Box,{ grow: 1, padding: false },[
      h(Menubar,{},[
        h(MenubarItem,{ onclick: actions.menuFile },_('MENU_FILE'))
      ]),
      h(BoxContainer,{},[
        h(Button,{ onclick: () => actions.loadURL() },_('ACTIONS_GO')),
        h(TextField,{
          onchange: ev => {
            actions.setInput({ name: 'url', value: ev.target.value });
            actions.loadURL();
          },
          value: state.url
        })
      ]),
      h(Tabs,{
        key: state.tab,
        selectedIndex: state.tab,
        labels: state.tabs.map(item => item.title),
        onchage: (ev,index,label) => actions.setTab(tab),
        oncontextmenu: (ev,index,label) => {
				  core.make('osjs/contextmenu').show({
					  position: ev.target,
					  menu: [
					    { label: _('NEWTAB'), onclick: () => actions.addTab() },
					    { label: _('CLOSE'), onclick: () => actions.removeTab(index) }
					  ]
			    });
        }
      },state.tabs.map(item => item.h))
    ]),$content);
  });
  return proc;
};
osjs.register(applicationName,register);
