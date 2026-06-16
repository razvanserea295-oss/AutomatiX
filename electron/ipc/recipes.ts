import { ipcRegister } from '../commands/registry';
import { withAuthenticatedUser, requirePositiveId } from '../middleware/auth';
import { RecipeService } from '../services/recipeService';

export function registerRecipeHandlers(): void {
  ipcRegister('get_recipes_overview', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, _user) => RecipeService.getOverview(db));
  });

  ipcRegister('get_recipe', async (args: any) => {
    requirePositiveId(args?.menu_item_id, 'menu_item_id');
    return withAuthenticatedUser(args?.token, (db, _user) => RecipeService.getRecipe(db, args.menu_item_id));
  });

  ipcRegister('add_recipe_item', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => RecipeService.addItem(db, user, args.request || args));
  });

  ipcRegister('update_recipe_item', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => RecipeService.updateItem(db, user, args.request || args));
  });

  ipcRegister('delete_recipe_item', async (args: any) => {
    return withAuthenticatedUser(args?.token, (db, user) => {
      requirePositiveId(args?.id, 'id');
      return RecipeService.deleteItem(db, user, args.id);
    });
  });
}
