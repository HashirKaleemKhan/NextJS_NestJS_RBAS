import { Module } from '@nestjs/common';
import { GraphQLResolver } from './graphql.resolver';

@Module({
  providers: [GraphQLResolver],
})
export class GraphQLModule {}