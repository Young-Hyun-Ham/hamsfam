


CREATE TABLE public.users (
	id uuid NOT null default gen_random_uuid(),
	sub text NOT NULL,
	email text UNIQUE,
	name text,
	avatar_url text,
	created_at timestamptz DEFAULT now(),
	password varchar,
	roles jsonb DEFAULT '["guest"]'::jsonb,
	CONSTRAINT users_pkey PRIMARY KEY (id),
	CONSTRAINT users_sub_key UNIQUE (sub)
);


CREATE TABLE public.scenarios (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	name text not null,
	description text not null,
	nodes jsonb NOT NULL,
	edges jsonb NOT NULL,
	start_node_id text not null,
	last_used_at timestamp(6) DEFAULT CURRENT_TIMESTAMP NULL,
	create_id varchar(50) NOT NULL,
	create_date timestamp(6) DEFAULT CURRENT_TIMESTAMP NULL,
	modify_id varchar(50) NULL,
	modify_date timestamp(6) NULL,
	user_id uuid NULL,
	CONSTRAINT scenario_pkey PRIMARY KEY (id)
);


CREATE TABLE public.menu (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	menu_id text NOT NULL,
	"label" text NOT NULL,
	href text NULL,
	"order" int4 NULL,
	lev int4 NOT NULL,
	up_id uuid NULL,
	"createdAt" timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT menu_pkey PRIMARY KEY (id),
	CONSTRAINT menu_parent_fkey FOREIGN KEY (up_id) REFERENCES nextjs.menu(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX menu_lev_up_id_idx ON nextjs.menu USING btree (lev, up_id);
CREATE UNIQUE INDEX menu_parent_code_href_uq ON nextjs.menu USING btree (up_id, menu_id, href);
CREATE INDEX menu_up_id_order_idx ON nextjs.menu USING btree (up_id, "order");


CREATE TABLE public.settings (
	id uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid not NULL,
	node_colors jsonb DEFAULT '{
	  "api": "#e74c3c",
	  "branch": "#2ecc71",
	  "delay": "#ffc40f",
	  "fixedmenu": "#e74c3c",
	  "form": "#9b59b6",
	  "iframe": "#2c3e50",
	  "link": "#34495e",
	  "llm": "#99bc1a",
	  "message": "#f39c12",
	  "scenario": "#7f8c8d",
	  "setSlot": "#8e44ad",
	  "slotfilling": "#3498db",
	  "toast": "#95a5a6"
	}'::jsonb,
	nodeTextColors jsonb DEFAULT '{
	  "api": "#ffffff",
	  "branch": "#ffffff",
	  "fixedmenu": "#ffffff",
	  "form": "#ffffff",
	  "iframe": "#ffffff",
	  "link": "#ffffff",
	  "llm": "#ffffff",
	  "message": "#ffffff",
	  "scenario": "#ffffff",
	  "setSlot": "#ffffff",
	  "slotfilling": "#ffffff",
	  "toast": "#ffffff"
	}'::jsonb,
	nodeVisibility jsonb DEFAULT '[
	  "message",
	  "form",
	  "branch",
	  "slotfilling",
	  "api",
	  "setSlot",
	  "delay",
	  "fixedmenu",
	  "link",
	  "iframe",
	  "scenario",
	  "llm"
	]'::jsonb,
	"createdAt" timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamptz(6) DEFAULT CURRENT_TIMESTAMP NOT null
)

