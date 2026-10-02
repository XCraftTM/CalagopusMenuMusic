import { faMusic } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Extension, ExtensionContext } from 'shared';
import AccountMusicCard from './elements/AccountMusicCard.tsx';
import LoginMusicToggle from './elements/LoginMusicToggle.tsx';
import MenuMusic from './elements/MenuMusic.tsx';
import ConfigurationPage from './pages/ConfigurationPage.tsx';

class DevXcrafttmMenumusicExtension extends Extension {
  public cardConfigurationPage: React.FC | null = ConfigurationPage;
  public cardComponent: React.FC | null = null;
  public cardIcon: React.ReactNode = <FontAwesomeIcon icon={faMusic} />;

  public initialize(ctx: ExtensionContext): void {
    // rendered on every page, login and register included, and survives route changes
    ctx.extensionRegistry.pages.global.appendComponent(MenuMusic);

    // on/off switch under the login form, for visitors who are logged out
    ctx.extensionRegistry.pages.auth.login.enterContainer((container) =>
      container.appendContentComponent(LoginMusicToggle),
    );

    // per-user on/off switch and volume on the account page
    ctx.extensionRegistry.pages.dashboard.account.enterAccountContainers((containers) =>
      containers.appendComponent(AccountMusicCard),
    );
  }
}

export default new DevXcrafttmMenumusicExtension();
