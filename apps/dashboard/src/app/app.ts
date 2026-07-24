import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TuiRoot } from '@taiga-ui/core';
import { DevTokenInput } from './core/dev-auth/dev-token-input';

@Component({
  imports: [RouterModule, DevTokenInput, TuiRoot],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'dashboard';
}
