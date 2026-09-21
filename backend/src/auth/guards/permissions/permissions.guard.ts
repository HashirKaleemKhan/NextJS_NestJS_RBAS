import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";

import { Reflector } from "@nestjs/core";

import { GqlExecutionContext } from "@nestjs/graphql";

import {
  PERMISSIONS_KEY,
} from "../../../common/decorators/permissions.decorator";

@Injectable()
export class PermissionsGuard
  implements CanActivate
{
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<
        string[]
      >(
        PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    // No permission requirement
    if (
      !requiredPermissions ||
      requiredPermissions.length === 0
    ) {
      return true;
    }

    let request: any;

    // -----------------------------------
    // GRAPHQL
    // -----------------------------------

    if (
      context.getType<
        "http" | "graphql"
      >() === "graphql"
    ) {
      const gqlContext =
        GqlExecutionContext.create(
          context,
        );

      request =
        gqlContext.getContext()?.req;
    }

    // -----------------------------------
    // REST / HTTP
    // -----------------------------------

    else {
      request =
        context
          .switchToHttp()
          .getRequest();
    }

    const user = request?.user;

    if (!user) {
      return false;
    }

    // -----------------------------------
    // ADMINISTRATOR
    // -----------------------------------

    if (user.isAdmin === true) {
      return true;
    }

    // -----------------------------------
    // NORMAL USER PERMISSIONS
    // -----------------------------------

    const userPermissions: string[] =
      user.permissions || [];

    return requiredPermissions.some(
      (permission) =>
        userPermissions.includes(
          permission,
        ),
    );
  }
}