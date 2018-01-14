# SteemNews
Script to fetch blog posts from steemit.com and append to div on own site.

## Details
Javascript that fetches blog posts from steemit.com, a blockchain based community. Script looks for specific user and tags, then formats the markup to html and adds 5 posts to div tag on page. When user reaches end of page, it repeats and loads 5 new posts.

The script is as used on https://spelmakare.se/news so specific for my needs. As it is fairly simple and written top to bottom, I have uploaded it in case it could be of use to anyone else. I myself tend to find useful info from sources like this.

## Dependencies
* https://steemit.com account
* https://jquery.com/
* https://github.com/cure53/DOMPurify
* https://jnordberg.github.io/dsteem/

## Usage
Create a skeleton html file download steemnews.js + dependencies (or link to cdn hosted versions). Include all scripts like this:
```
<script src="jquery.min.js"></script>
<script src="purify.min.js"></script>
<script src="dsteem.js"></script>
<script src="steemnews.js"></script>
```

edit the const at top of steemnews.js:
```
const author = "Your Steemit User name";
const tagNews = "A tag you want to use as news.";
const tagBlog = "Additional tag to use as news.";
```
Modify any id or class in script/html and add a css (I think only 4-5 id/class used).
That's it!

## Example of html
```
<html>
<head>
    <title></title>
    <meta charset="utf-8" />
    
    <!-- Scripts -->
    <script src="/assets/js/jquery.min.js"></script>
    <script src="/assets/js/purify.min.js"></script>
    <script src="/assets/js/dsteem.js"></script>
    <script src="/assets/js/smSteem.js"></script>
</head>
<body>
  <div id="main">
    <div class="inner">
      <h1>Latest News &amp; Blog Posts</h1>
      <p>
          <b>Loading ...</b>
      </p>
      <!-- Filled from Steemit -->
    </div>
  </div>
</body>
</html>
```
