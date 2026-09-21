import { Query, Resolver } from '@nestjs/graphql';

@Resolver()
export class GraphqlResolver {
  @Query(() => String)
  graphqlStatus(): string {
    return 'GraphQL is working';
  }
}