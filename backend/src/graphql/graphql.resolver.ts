import { Resolver, Query } from '@nestjs/graphql';

@Resolver()
export class GraphQLResolver {
  @Query(() => String)
  hello(): string {
    return 'GraphQL is working';
  }
}