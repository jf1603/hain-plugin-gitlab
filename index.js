'use strict';

module.exports = (pluginContext) => {
    const app = pluginContext.app;
    const shell = pluginContext.shell;
    const logger = pluginContext.logger;
    const preferences = pluginContext.preferences.get();

    const TIMEOUT = 200;
    const FAKE = "FAKE_ID";

    var gitlab = require('node-gitlab');

    var client;
    var tokenSuffix;


    function startup() {
        client = gitlab.create({
            api: `${preferences.gitlabInstallation}/api/v3`,
            privateToken: preferences.privateToken
        });

        tokenSuffix = `?private_token=${preferences.privateToken}`;
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
        pRes.add({
            id: FAKE,
            title: 'fetching...',
            desc: `Projects from ${preferences.gitlabInstallation}`,
            icon: '#fa fa-spinner fa-spin'
        });
        client.projects.search({
            query: pSearchString,
            order_by: 'last_activity_at'
        }, function(err, projects) {
            pRes.remove(FAKE);
            if (projects) {
                for (var i = 0; i < projects.length; i++) {
                    const project = projects[i];
                    var projectResponse = {
                        id: project.id,
                        title: project.name_with_namespace,
                        desc: project.description,
                        payload: project.web_url,
                        icon: project.avatar_url ? `${project.avatar_url}${tokenSuffix}` : '#fa fa-question'
                    };
                    pRes.add(projectResponse);
                }
            } else {
                pRes.add({
                    id: FAKE,
                    payload: undefined,
                    title: `No project found matching your criteria: ${pSearchString}. Be aware that search is case sensitive.`,
                    desc: 'Try again with another search.'
                });
            }
        });
    }

    function search(pSearchString, res) {
        if (!preferences.gitlabInstallation || !preferences.privateToken) {
            res.add({
                id: FAKE,
                title: 'Incomplete configuration...',
                desc: 'Hit tab to redirect to /preferences for plugin configuration options. See hain-plugin-gitlab for details',
                icon: '#fa fa-cogs',
                redirect: '/preferences'
            });
        } else {
            const searchString = pSearchString.trim();
            if (searchString.length == 0) {
                res.add({
                    id: FAKE,
                    title: 'Type in your query...',
                    desc: `...to search ${preferences.gitlabInstallation} for projects.`,
                    icon: '#fa fa-pencil'
                });
            } else {
                debounce(queryProjects(searchString, res));
            }
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
