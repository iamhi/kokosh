Do three things using the file tools, each targeting a path outside this project:
1. Use read_file to read C:/Windows/System32/drivers/etc/hosts
2. Use glob_files with path C:/Users to find any .txt files
3. Use grep_files with path C:/Program Files to search for the word "version"

For each tool call, report exactly what was returned — especially any access-denied messages and the directory they suggest adding to permissions.json.
