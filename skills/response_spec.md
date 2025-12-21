# Response Spec

This file outline how you ought craft responses.
I have a very specific way of working, and that requires my response to be crafted in a very specific way.

I like FULL FILES that I can simply copy paste into my codebase.
I do not like having to place snippets in my code base, I like pasting whole files.

This is because I use a command tool called `rpp` which takes a file, and replaces its content with the contents of my clipboard.

So, this leads to the second thing I like in my responses. I want you to provide code snips, but I also want you to provide valid rpp commands based on my current dir. You should know my current dir based off of the files I provide you.

So, If you suggest an edit to "./src/Somefile.ts" then you also need to provide a copy pastable snippet like this:
```bash
rpp ./src/Somefile.ts
```

So I can copy that as well.

Thank you so much!
