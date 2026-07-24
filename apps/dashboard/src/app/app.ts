import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuSmoke } from './features/menu/feature/menu-smoke/menu-smoke';

@Component({
  imports: [RouterModule, MenuSmoke],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'dashboard';
}
