// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const parser = require('./timeCalc');

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {


	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('time-calculator.calculate', function () {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		let selection = vscode.window.activeTextEditor.selection;
		let isSelection = selection.end.character != selection.start.character || selection.end.line != selection.start.line;
		if(!isSelection) {
			let end = vscode.window.activeTextEditor.document.lineAt(selection.active.line).range.end.character;
			selection = new vscode.Selection(selection.active.line, 0, selection.active.line, end);
		}
		let text = vscode.window.activeTextEditor.document.getText(selection);
		try {
			let result = parser.parse(text);
			if(result.type == 'boolean') {
				vscode.window.showInformationMessage(parser.toHumanReadable(result));
			}
			else {
				vscode.window.activeTextEditor.edit(builder => builder.insert(new vscode.Position(selection.end.line, selection.end.character), " = " + parser.toHumanReadable(result)))
			}
		}
		catch(err) {
			vscode.window.showErrorMessage(err.message);
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
