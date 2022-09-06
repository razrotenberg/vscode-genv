import * as vscode from 'vscode';
import * as environment from '../environment';

export class EnvProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
		if (element) {
			return Promise.resolve([]);
		} else {
			return Promise.resolve(this.getInfoItems());
		}
	}

	private getInfoItems(): vscode.TreeItem[] {
		if (environment.activated()) {
			return [
        {
          label: 'Name',
          description: environment.config().name,
          tooltip: 'Click to configure the environment name',
          command: {
            title: 'Configure Environment Name',
            command: 'genv.config.name',
          },
        },
        {
          label: 'Device Count',
          description: environment.config().gpus ? `${environment.config().gpus}` : undefined,
          tooltip: 'Click to configure the environment device count',
          command: {
            title: 'Configure Environment Device Count',
            command: 'genv.config.gpus',
          },
        },
        environment.attacahed() ? {
          label: 'Attached',
          description: `${environment.indices()}`,
          tooltip: 'Click to detach the environment',
          command: {
            title: 'Detach Environment',
            command: 'genv.detach',
          },
        } : {
          label: 'Detached',
          tooltip: 'Click to attach the environment',
          command: {
            title: 'Attach Environment',
            command: 'genv.attach',
          },
        },
      ];
		} else {
			return [];
		}
	}

	private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}
}
