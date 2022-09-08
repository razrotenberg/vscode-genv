import * as vscode from 'vscode';
import * as env from '../genv/env';
import * as terminal from '../genv/terminal';
import { Provider } from '../provider/env';

let provider: Provider;
let statusBarItem: vscode.StatusBarItem;

/**
 * Initializes the active environment related features of the extension.
 *
 * This includes the view, status bar item, commands and terminals.
 */
export function init(context: vscode.ExtensionContext) {
    provider = new Provider();
    context.subscriptions.push(vscode.window.registerTreeDataProvider('genv.env', provider));

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    context.subscriptions.push(statusBarItem);

    context.subscriptions.push(vscode.commands.registerCommand('genv.env.activate', activate));
    context.subscriptions.push(vscode.commands.registerCommand('genv.env.attach', attach));
    context.subscriptions.push(vscode.commands.registerCommand('genv.env.detach', detach));
    context.subscriptions.push(vscode.commands.registerCommand('genv.env.config.gpus', configGPUs));
    context.subscriptions.push(vscode.commands.registerCommand('genv.env.config.name', configName));

    context.subscriptions.push(vscode.window.onDidOpenTerminal(terminal.activateIfEnvActivated));
}

/**
 * Refreshes the status of the active environment.
 */
function refresh() {
    provider.refresh();

    if (env.attacahed()) {
        statusBarItem.text = env.config().gpus === 1 ? '1 GPU' : `${env.config().gpus} GPUs`;
        statusBarItem.tooltip = `Environment is attached to ${statusBarItem.text} at ${env.indices()}`;
        statusBarItem.command = { title: 'Reattach', command: 'genv.env.attach', arguments: [true] };
    } else {
        statusBarItem.command = 'genv.env.attach';
        statusBarItem.tooltip = 'Environment is not attached to any GPU';
        statusBarItem.text = 'No GPUs';
    }
}

/**
 * Activates the environment if not already activated.
 *
 * Configures its name, shows the status bar item, activates all open terminals, and refreshes the environment views.
 */
async function activate() {
    if (env.activated()) {
        vscode.window.showWarningMessage('Already running in an activated GPU environment');
    } else {
        await env.activate();
        await env.configName(`vscode/${vscode.workspace.name}`);

        statusBarItem.show();

        vscode.window.terminals.forEach(terminal.activate);

        refresh();

        vscode.commands.executeCommand('genv.envs.refresh');
        vscode.commands.executeCommand('setContext', 'genv.env.activated', true);
    }
}

/**
 * Attach the environment to devices.
 *
 * Activates the environment if not already active.
 * Configures the environment device count if not already configured, or if explicitly requested.
 * Refreshes all open terminals and the environment and devices views.
 *
 * @param reconfig - Reconfigure the environment
 */
async function attach(reconfig: boolean | any=false) {
    if (!env.activated()) {
        await activate();
    }

    if (env.activated()) {
        if (reconfig === true || env.config().gpus === undefined) {
            await configGPUs();
        }

        if (env.config().gpus) {
            try {
                await env.attach();
            } catch (error: any) {
                vscode.window.showErrorMessage(`${error.stderr}`);
                return;
            }

            for (let terminal of vscode.window.terminals) {
                terminal.sendText('genv attach --refresh');
            }

            refresh();

            vscode.commands.executeCommand('genv.devices.refresh');
        }
    }
}

/**
 * Detaches the active environment from devices.
 *
 * Shows a quick pick yes/no before detaching.
 * Refreshes all open terminals and the environment and devices views.
 */
async function detach() {
    if (env.activated()) {
        if (env.attacahed()) {
            if (await vscode.window.showQuickPick(['No', 'Yes'], { placeHolder: 'Are you sure you want to detach the environment from GPUs?' }) === 'Yes') {
                await env.detach();

                for (let terminal of vscode.window.terminals) {
                    terminal.sendText('genv attach --refresh');
                }

                refresh();

                vscode.commands.executeCommand('genv.devices.refresh');
            }
        }
    } else {
        vscode.window.showWarningMessage('Not running in an activated GPU environment');
    }
}

/**
 * Configures the active environment device count.
 *
 * Refreshes all open terminals and the environment.
 * Reattaches to devices if already attached.
 */
async function configGPUs() {
    if (env.activated()) {
        const input: string | undefined = await vscode.window.showInputBox({
            placeHolder: 'Enter GPU count for the environment',
            value: env.config().gpus ? `${env.config().gpus}` : undefined,
            validateInput: function(input: string): string | undefined {
                return /^([1-9]\d*)?$/.test(input) ? undefined : 'Must be an integer grather than 0';
            }
        });

        if (input) {
            const gpus: number = parseInt(input);

            await env.configGPUs(gpus);

            for (let terminal of vscode.window.terminals) {
                terminal.sendText('genv config gpus --refresh');
            }

            refresh();

            if (env.attacahed()) {
                await attach();
            }
        }
    } else {
        vscode.window.showErrorMessage('Not running in an activated GPU environment');
    }
}

/**
 * Configures the active environment name.
 *
 * Refreshes all open terminals the environment views.
 */
async function configName() {
    if (env.activated()) {
        const name: string | undefined = await vscode.window.showInputBox({
            placeHolder: 'Enter name for the environment',
            value: env.config().name,
        });

        if (name) {
            await env.configName(name);

            for (let terminal of vscode.window.terminals) {
                terminal.sendText('genv config name --refresh');
            }

            refresh();

            vscode.commands.executeCommand('genv.envs.refresh');
        }
    } else {
        vscode.window.showErrorMessage('Not running in an activated GPU environment');
    }
}
