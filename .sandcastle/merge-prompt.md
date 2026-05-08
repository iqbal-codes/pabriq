# TASK

Merge the following branches into the current branch:

{{BRANCHES}}

For each branch:

1. Run `git merge <branch> --no-edit`
2. If there are merge conflicts, resolve them intelligently by reading both sides and choosing the correct resolution
3. After resolving conflicts, run `bun run typecheck` and `bun run test` to verify everything works
4. If tests fail, fix the issues before proceeding to the next branch

After all branches are merged, make a single commit summarizing the merge.

# PUSH & CREATE PR

1. Push the merged branch to remote:
   `git push origin {{TARGET_BRANCH}}`

2. Create a pull request:
   `gh pr create --title "Sandcastle: Merge completed issues" --body "Completed by Sandcastle automation

{{ISSUES}}" --base {{TARGET_BRANCH}}`

# CLOSE ISSUES

For each branch that was merged, close its issue using the following command:

`gh issue close <ID> --comment "Completed by Sandcastle"`

Here are all the issues:

{{ISSUES}}

Once you've merged everything you can, output <promise>COMPLETE</promise>.
