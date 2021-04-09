import { ButtonView, injectWebfxCss, InputView, jsx, utils, View } from "@yuuza/webfx";
import css from "../style.css";

injectWebfxCss();
utils.injectCss(css);

class App extends View {
    inputView = new InputView({ placeholder: "URL or pipe name" });
    createDom() {
        return <main class="app">
            <h1 id="title">Pipe</h1>
            {this.inputView}
            <div id="pipe-action-btns">
                <div class="btn-group">
                    <ButtonView>Upload file</ButtonView>
                    <ButtonView>Upload text</ButtonView>
                </div>
                <div class="btn-group">
                    <ButtonView>Download file</ButtonView>
                    <ButtonView>Raw</ButtonView>
                </div>
            </div>
        </main>
    }
    postCreateDom() {
        (this.inputView.dom as HTMLInputElement).name = 'pipe';
    }
}

var app = new App();
document.body.appendChild(app.dom);
