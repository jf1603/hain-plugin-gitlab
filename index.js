'use strict';

module.exports = (pluginContext) => {
    const app = pluginContext.app;
    const shell = pluginContext.shell;
    const logger = pluginContext.logger;
    const preferences = pluginContext.preferences;

    const TIMEOUT = 200;
    const FAKE = "FAKE_ID";

    var gitlab = require('node-gitlab');

    var client;
    var tokenSuffix;

    const initClient = (prefs) => {
        if (prefs.gitlabInstallation && prefs.privateToken) {
            client = gitlab.createPromise({
                api: prefs.gitlabInstallation + '/api/v3',
                privateToken: prefs.privateToken
            });
            tokenSuffix = `?private_token=${prefs.privateToken}`;
        }
    };

    function message(pTitle, pDesc, pIcon, pRedirect) {
        return {
            id: FAKE,
            title: pTitle,
            desc: pDesc,
            icon: pIcon,
            redirect: pRedirect
        };
    }

    function startup() {
        initClient(preferences.get());
        preferences.on('update', initClient);
    }

    function debounce(pFunction) {
        var timer;
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(function() {
            pFunction.fn(pFunction.arg1);
            timer = 0;
        }, TIMEOUT);
    }

    function queryProjects(pSearchString, pRes) {
        const prefs = preferences.get();
        pRes.add(message('fetching...', `Projects from ${prefs.gitlabInstallation}`, '#fa fa-spinner fa-spin'));
        client.projects.search({
            query: pSearchString,
            order_by: prefs.orderBy
        }).then((projects) => {
            pRes.remove(FAKE);
            if (projects.length == 0) {
                pRes.remove(FAKE);
                pRes.add(message(`No project found matching your criteria: '${pSearchString}'. Be aware that search is case sensitive.`, 'Try again with another search.', '#fa fa-question'));
                return;
            }

            projects.forEach(project => {
                pRes.add({
                    id: project.id,
                    title: project.name_with_namespace,
                    desc: project.description || '',
                    payload: project.web_url,
                    icon: project.avatar_url ? `${project.avatar_url}${tokenSuffix}` : '#fa fa-question'
                });
            });

        }).catch(err => {
            pRes.remove(FAKE);
            pRes.add(message('Unable to fetch your results.', 'Make sure plugin preferences are correct, Click here to check', '#fa fa-exclamation', '/preferences'));
        });
    }

    function search(pSearchString, res) {
        const prefs = preferences.get();

        if (!client) {
            res.add(message('Incomplete configuration...', 'Hit tab to redirect to /preferences for plugin configuration options. See hain-plugin-gitlab for details', '#fa fa-cogs', '/preferences'));
            return;
        } else {
            res.remove(FAKE);
        }

        const searchString = pSearchString.trim();
        if (searchString.length == 0) {
            res.add(message('Type in your query...', `...to search ${prefs.gitlabInstallation} for projects.`, '#fa fa-pencil'));
        } else {
            debounce(queryProjects(searchString, res));
        }
    }

    function execute(id, payload) {
        if (payload) {
            shell.openExternal(payload);
        }
        app.close();
    }

    return {
        startup,
        search,
        execute
    };
};
